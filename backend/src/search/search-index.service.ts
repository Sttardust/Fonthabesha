import { Inject, Injectable, Logger, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MeiliSearch } from 'meilisearch';

import { PrismaService } from '../prisma/prisma.service';
import type { AppEnvironment } from '../shared/config/app-env';

type SearchDocument = {
  id: string;
  slug: string;
  nameEn: string;
  nameAm: string | null;
  nativeName: string | null;
  descriptionEn: string | null;
  descriptionAm: string | null;
  script: string;
  primaryLanguage: string | null;
  categorySlug: string | null;
  categoryName: string | null;
  licenseCode: string | null;
  licenseName: string | null;
  publisherSlug: string | null;
  publisherName: string | null;
  tagSlugs: string[];
  tagNames: string[];
  designerSlugs: string[];
  designerNames: string[];
  styleNames: string[];
  styleSlugs: string[];
  supportsEthiopic: boolean;
  supportsLatin: boolean;
  isVariableFamily: boolean;
  styleCount: number;
  publishedAt: string | null;
  insertedAt: string;
  downloadCount: number;
};

@Injectable()
export class SearchIndexService implements OnModuleInit {
  private readonly logger = new Logger(SearchIndexService.name);
  private readonly client: MeiliSearch;
  private readonly indexUid = 'font_families';

  constructor(
    private readonly prisma: PrismaService,
    @Inject(ConfigService)
    configService: ConfigService<AppEnvironment, true>,
  ) {
    this.client = new MeiliSearch({
      host: configService.get('MEILISEARCH_URL', { infer: true }),
      apiKey: configService.get('MEILISEARCH_API_KEY', { infer: true }),
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.ensureIndex();
    } catch (error) {
      this.logger.warn(
        `Search index initialization failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async syncFamilyById(familyId: string): Promise<void> {
    await this.ensureIndex();
    const document = await this.buildDocument(familyId);

    if (!document) {
      await this.removeFamilyById(familyId);
      return;
    }

    const task = await this.client.index<SearchDocument>(this.indexUid).addDocuments([document], {
      primaryKey: 'id',
    });
    await this.waitForTask(task.taskUid);
  }

  async removeFamilyById(familyId: string): Promise<void> {
    await this.ensureIndex();
    const task = await this.client.index(this.indexUid).deleteDocument(familyId);
    await this.waitForTask(task.taskUid);
  }

  async syncAllApprovedFamilies(): Promise<{ indexed: number }> {
    await this.ensureIndex();
    const families = await this.prisma.fontFamily.findMany({
      where: {
        status: 'approved',
      },
      select: {
        id: true,
      },
    });

    const documents = (
      await Promise.all(families.map((family) => this.buildDocument(family.id)))
    ).filter((document): document is SearchDocument => Boolean(document));

    const index = this.client.index<SearchDocument>(this.indexUid);
    const deleteTask = await index.deleteAllDocuments();
    await this.waitForTask(deleteTask.taskUid);

    if (documents.length > 0) {
      const addTask = await index.addDocuments(documents, {
        primaryKey: 'id',
      });
      await this.waitForTask(addTask.taskUid);
    }

    return {
      indexed: documents.length,
    };
  }

  async searchFamilies(args: {
    query?: string;
    category?: string;
    script?: string;
    license?: string;
    publisher?: string;
    variable?: boolean;
    sort?: 'popular' | 'newest' | 'alphabetical';
    page: number;
    pageSize: number;
  }): Promise<{ ids: string[]; totalItems: number }> {
    await this.ensureIndex();

    const response = await this.client.index<SearchDocument>(this.indexUid).search(
      args.query?.trim() || '',
      {
        filter: this.buildFilter(args),
        sort: this.buildSort(args.sort),
        limit: args.pageSize,
        offset: (args.page - 1) * args.pageSize,
      },
    );

    return {
      ids: response.hits.map((hit) => hit.id),
      totalItems: response.estimatedTotalHits ?? response.hits.length,
    };
  }

  private async ensureIndex(): Promise<void> {
    const index = this.client.index<SearchDocument>(this.indexUid);

    try {
      await this.client.getIndex(this.indexUid);
    } catch {
      const task = await this.client.createIndex(this.indexUid, { primaryKey: 'id' });
      await this.waitForTask(task.taskUid);
    }

    const searchableTask = await index.updateSearchableAttributes([
      'nameEn',
      'nameAm',
      'nativeName',
      'descriptionEn',
      'descriptionAm',
      'tagNames',
      'designerNames',
      'publisherName',
      'categoryName',
      'styleNames',
    ]);
    await this.waitForTask(searchableTask.taskUid);

    const filterableTask = await index.updateFilterableAttributes([
      'categorySlug',
      'script',
      'licenseCode',
      'publisherSlug',
      'isVariableFamily',
      'supportsEthiopic',
      'supportsLatin',
    ]);
    await this.waitForTask(filterableTask.taskUid);

    const sortableTask = await index.updateSortableAttributes(['publishedAt', 'nameEn', 'downloadCount']);
    await this.waitForTask(sortableTask.taskUid);
  }

  private async buildDocument(familyId: string): Promise<SearchDocument | null> {
    const family = await this.prisma.fontFamily.findUnique({
      where: {
        id: familyId,
        status: 'approved',
      },
      include: {
        category: true,
        license: true,
        publisher: true,
        tags: {
          include: {
            tag: true,
          },
        },
        designers: {
          include: {
            designer: true,
          },
        },
        styles: {
          where: {
            status: 'approved',
          },
          orderBy: [{ isDefault: 'desc' }, { weightClass: 'asc' }, { name: 'asc' }],
        },
        _count: {
          select: {
            downloadEvents: true,
          },
        },
      },
    });

    if (!family) {
      return null;
    }

    return {
      id: family.id,
      slug: family.slug,
      nameEn: family.nameEn,
      nameAm: family.nameAm,
      nativeName: family.nativeName,
      descriptionEn: family.descriptionEn,
      descriptionAm: family.descriptionAm,
      script: family.script,
      primaryLanguage: family.primaryLanguage,
      categorySlug: family.category?.slug ?? null,
      categoryName: family.category?.name ?? null,
      licenseCode: family.license?.code ?? null,
      licenseName: family.license?.name ?? null,
      publisherSlug: family.publisher?.slug ?? null,
      publisherName: family.publisher?.name ?? null,
      tagSlugs: family.tags.map((entry) => entry.tag.slug),
      tagNames: family.tags.flatMap((entry) =>
        [entry.tag.nameEn, entry.tag.nameAm].filter((value): value is string => Boolean(value)),
      ),
      designerSlugs: family.designers.map((entry) => entry.designer.slug),
      designerNames: family.designers.map((entry) => entry.designer.name),
      styleNames: family.styles.map((style) => style.name),
      styleSlugs: family.styles.map((style) => style.slug),
      supportsEthiopic: family.supportsEthiopic,
      supportsLatin: family.supportsLatin,
      isVariableFamily: family.isVariableFamily,
      styleCount: family.styles.length,
      publishedAt: family.publishedAt?.toISOString() ?? null,
      insertedAt: family.insertedAt.toISOString(),
      downloadCount: family._count.downloadEvents,
    };
  }

  private buildFilter(args: {
    category?: string;
    script?: string;
    license?: string;
    publisher?: string;
    variable?: boolean;
  }): string[] {
    const filters: string[] = [];

    if (args.category?.trim()) {
      filters.push(`categorySlug = "${this.escapeFilterValue(args.category.trim())}"`);
    }

    if (args.script?.trim()) {
      filters.push(`script = "${this.escapeFilterValue(args.script.trim())}"`);
    }

    if (args.license?.trim()) {
      filters.push(`licenseCode = "${this.escapeFilterValue(args.license.trim().toUpperCase())}"`);
    }

    if (args.publisher?.trim()) {
      filters.push(`publisherSlug = "${this.escapeFilterValue(args.publisher.trim())}"`);
    }

    if (typeof args.variable === 'boolean') {
      filters.push(`isVariableFamily = ${args.variable}`);
    }

    return filters;
  }

  private buildSort(
    sort: 'popular' | 'newest' | 'alphabetical' | undefined,
  ): string[] | undefined {
    switch (sort) {
      case 'alphabetical':
        return ['nameEn:asc'];
      case 'popular':
        return ['downloadCount:desc', 'publishedAt:desc'];
      case 'newest':
      default:
        return ['publishedAt:desc'];
    }
  }

  private escapeFilterValue(value: string): string {
    return value.replace(/"/g, '\\"');
  }

  private async waitForTask(taskUid: number): Promise<void> {
    const timeoutAt = Date.now() + 15_000;

    try {
      const task = await this.client.tasks.waitForTask(taskUid, {
        timeout: timeoutAt - Date.now(),
        interval: 200,
      });

      if (task.status !== 'succeeded') {
        throw new ServiceUnavailableException(
          `Meilisearch task ${taskUid} did not complete successfully`,
        );
      }
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      throw new ServiceUnavailableException(`Timed out waiting for Meilisearch task ${taskUid}`);
    }
  }
}
