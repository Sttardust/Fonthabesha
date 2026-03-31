import { createHash } from 'node:crypto';

import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type FontFamily } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

import { AuthContextService } from '../auth/auth-context.service';
import type { AuthenticatedRequest } from '../auth/auth-request';
import { PrismaService } from '../prisma/prisma.service';
import { SearchIndexService } from '../search/search-index.service';
import type { AppEnvironment } from '../shared/config/app-env';
import { ListFontsDto } from './dto/list-fonts.dto';

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authContext: AuthContextService,
    private readonly searchIndex: SearchIndexService,
    @Inject(ConfigService)
    private readonly configService: ConfigService<AppEnvironment, true>,
  ) {}

  async listFonts(query: ListFontsDto) {
    return this.getFonts(query);
  }

  async searchFonts(query: ListFontsDto, request: AuthenticatedRequest) {
    const result = query.q?.trim()
      ? await this.getFontsFromSearchIndex(query)
      : await this.getFonts(query);
    const currentUser = await this.authContext.findActiveUserFromRequest(request);
    const normalizedQuery = this.normalizeSearchQuery(query.q);

    await this.prisma.searchEvent.create({
      data: {
        queryText: query.q?.trim() || null,
        normalizedQueryText: normalizedQuery,
        resultCount: result.pagination.totalItems,
        ipHash: this.hashValue(request.ip),
        userId: currentUser?.id ?? null,
        source: 'public_api',
      },
    });

    return result;
  }

  async getFilters() {
    const [categories, licenses, publishers, designers, tags] = await Promise.all([
      this.prisma.category.findMany({
        orderBy: {
          name: 'asc',
        },
        select: {
          name: true,
          slug: true,
        },
      }),
      this.prisma.license.findMany({
        where: {
          isActive: true,
        },
        orderBy: {
          name: 'asc',
        },
        select: {
          code: true,
          name: true,
        },
      }),
      this.prisma.publisher.findMany({
        where: {
          isActive: true,
          families: {
            some: {
              status: 'approved',
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
        select: {
          id: true,
          name: true,
          slug: true,
        },
      }),
      this.prisma.designer.findMany({
        where: {
          fontFamilyDesigners: {
            some: {
              family: {
                status: 'approved',
              },
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
        select: {
          id: true,
          name: true,
          slug: true,
        },
      }),
      this.prisma.tag.findMany({
        where: {
          fontFamilyTags: {
            some: {
              family: {
                status: 'approved',
              },
            },
          },
        },
        orderBy: {
          nameEn: 'asc',
        },
        select: {
          id: true,
          nameEn: true,
          nameAm: true,
          slug: true,
        },
      }),
    ]);

    return {
      categories: categories.map((category) => category.name),
      scripts: ['ethiopic'],
      licenses,
      publishers,
      designers,
      tags: tags.map((tag) => ({
        id: tag.id,
        name: {
          en: tag.nameEn,
          am: tag.nameAm,
        },
        slug: tag.slug,
      })),
    };
  }

  async getFamilyStyles(slug: string) {
    const family = await this.prisma.fontFamily.findUnique({
      where: {
        slug,
        status: 'approved',
      },
      select: {
        styles: {
          where: {
            status: 'approved',
          },
          orderBy: [{ isDefault: 'desc' }, { weightClass: 'asc' }, { name: 'asc' }],
          select: {
            id: true,
            name: true,
            slug: true,
            weightClass: true,
            weightLabel: true,
            isItalic: true,
            isVariable: true,
            isDefault: true,
            format: true,
            fileSizeBytes: true,
            axesJson: true,
            featuresJson: true,
            metricsJson: true,
          },
        },
      },
    });

    if (!family) {
      throw new NotFoundException('Published family not found');
    }

    return family.styles.map((style) => ({
      id: style.id,
      name: style.name,
      slug: style.slug,
      assetUrl: this.toStyleAssetUrl(style.id),
      weightClass: style.weightClass,
      weightLabel: style.weightLabel,
      isItalic: style.isItalic,
      isVariable: style.isVariable,
      isDefault: style.isDefault,
      format: style.format,
      fileSizeBytes: Number(style.fileSizeBytes ?? 0n),
      axes: style.axesJson ?? [],
      features: style.featuresJson ?? [],
      metrics: style.metricsJson ?? {},
    }));
  }

  async getFamilyDetail(slug: string, request: AuthenticatedRequest) {
    const family = await this.prisma.fontFamily.findUnique({
      where: {
        slug,
        status: 'approved',
      },
      include: {
        category: true,
        license: true,
        publisher: true,
        designers: {
          include: {
            designer: true,
          },
          orderBy: {
            sortOrder: 'asc',
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
        styles: {
          where: {
            status: 'approved',
          },
          orderBy: [{ isDefault: 'desc' }, { weightClass: 'asc' }, { name: 'asc' }],
        },
      },
    });

    if (!family) {
      throw new NotFoundException('Published family not found');
    }

    const currentUser = await this.authContext.findActiveUserFromRequest(request);

    await this.prisma.viewEvent.create({
      data: {
        familyId: family.id,
        userId: currentUser?.id ?? null,
        ipHash: this.hashValue(request.ip),
        source: 'public_api',
      },
    });

    return {
      id: family.id,
      slug: family.slug,
      name: {
        en: family.nameEn,
        am: family.nameAm,
        native: family.nativeName,
      },
      description: {
        en: family.descriptionEn,
        am: family.descriptionAm,
      },
      category: family.category?.name ?? null,
      script: family.script,
      primaryLanguage: family.primaryLanguage,
      license: family.license
        ? {
            code: family.license.code,
            name: family.license.name,
            summary: {
              en: family.license.summaryEn,
              am: family.license.summaryAm,
            },
          }
        : null,
      publisher: family.publisher
        ? {
            id: family.publisher.id,
            name: family.publisher.name,
            slug: family.publisher.slug,
          }
        : null,
      designers: family.designers.map((entry) => ({
        id: entry.designer.id,
        name: entry.designer.name,
        slug: entry.designer.slug,
      })),
      tags: family.tags.map((entry) => ({
        id: entry.tag.id,
        name: {
          en: entry.tag.nameEn,
          am: entry.tag.nameAm,
        },
        slug: entry.tag.slug,
      })),
      supports: {
        ethiopic: family.supportsEthiopic,
        latin: family.supportsLatin,
      },
      specimenDefaults: {
        am: family.specimenTextDefaultAm,
        en: family.specimenTextDefaultEn,
      },
      styles: family.styles.map((style) => this.mapStyleDetail(style)),
      download: {
        familyPackageAvailable: family.styles.some((style) => Boolean(style.fileKey)),
      },
      relatedFamilies: [],
      coverImageUrl: this.toAssetUrl(family.coverImageKey),
      publishedAt: family.publishedAt,
      version: family.versionLabel,
    };
  }

  private async getFonts(query: ListFontsDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = this.buildFamilyWhere(query);
    const orderBy = this.buildOrderBy(query.sort);
    const skip = (page - 1) * pageSize;

    const [totalItems, families] = await Promise.all([
      this.prisma.fontFamily.count({ where }),
      this.prisma.fontFamily.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        include: {
          category: true,
          license: true,
          publisher: true,
          designers: {
            include: {
              designer: true,
            },
            orderBy: {
              sortOrder: 'asc',
            },
          },
          tags: {
            include: {
              tag: true,
            },
          },
          styles: {
            where: {
              status: 'approved',
            },
            orderBy: [{ isDefault: 'desc' }, { weightClass: 'asc' }, { name: 'asc' }],
          },
        },
      }),
    ]);

    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize);

    return {
      items: families.map((family) => this.mapFamilyListItem(family)),
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
        hasNext: page < totalPages,
      },
    };
  }

  private async getFontsFromSearchIndex(query: ListFontsDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const searchResult = await this.searchIndex.searchFamilies({
      query: query.q,
      category: query.category,
      script: query.script,
      license: query.license,
      publisher: query.publisher,
      variable: query.variable,
      sort: query.sort,
      page,
      pageSize,
    });

    if (searchResult.ids.length === 0) {
      return {
        items: [],
        pagination: {
          page,
          pageSize,
          totalItems: 0,
          totalPages: 0,
          hasNext: false,
        },
      };
    }

    const families = await this.prisma.fontFamily.findMany({
      where: {
        id: {
          in: searchResult.ids,
        },
        status: 'approved',
      },
      include: {
        category: true,
        license: true,
        publisher: true,
        designers: {
          include: {
            designer: true,
          },
          orderBy: {
            sortOrder: 'asc',
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
        styles: {
          where: {
            status: 'approved',
          },
          orderBy: [{ isDefault: 'desc' }, { weightClass: 'asc' }, { name: 'asc' }],
        },
      },
    });

    const orderedFamilies = searchResult.ids
      .map((familyId) => families.find((family) => family.id === familyId))
      .filter((family): family is NonNullable<typeof family> => Boolean(family));

    const totalPages =
      searchResult.totalItems === 0 ? 0 : Math.ceil(searchResult.totalItems / pageSize);

    return {
      items: orderedFamilies.map((family) => this.mapFamilyListItem(family)),
      pagination: {
        page,
        pageSize,
        totalItems: searchResult.totalItems,
        totalPages,
        hasNext: page < totalPages,
      },
    };
  }

  private buildFamilyWhere(query: ListFontsDto): Prisma.FontFamilyWhereInput {
    const normalizedQuery = this.normalizeSearchQuery(query.q);

    return {
      status: 'approved',
      script: query.script?.trim() || undefined,
      isVariableFamily: query.variable,
      category: query.category
        ? {
            slug: query.category.trim(),
          }
        : undefined,
      license: query.license
        ? {
            code: query.license.trim().toUpperCase(),
          }
        : undefined,
      publisher: query.publisher
        ? {
            slug: query.publisher.trim(),
          }
        : undefined,
      OR: normalizedQuery
        ? [
            { nameEn: { contains: normalizedQuery, mode: 'insensitive' } },
            { nameAm: { contains: normalizedQuery, mode: 'insensitive' } },
            { nativeName: { contains: normalizedQuery, mode: 'insensitive' } },
            { descriptionEn: { contains: normalizedQuery, mode: 'insensitive' } },
            { descriptionAm: { contains: normalizedQuery, mode: 'insensitive' } },
            {
              tags: {
                some: {
                  tag: {
                    OR: [
                      { nameEn: { contains: normalizedQuery, mode: 'insensitive' } },
                      { nameAm: { contains: normalizedQuery, mode: 'insensitive' } },
                    ],
                  },
                },
              },
            },
          ]
        : undefined,
    };
  }

  private buildOrderBy(sort: ListFontsDto['sort']): Prisma.FontFamilyOrderByWithRelationInput[] {
    switch (sort) {
      case 'alphabetical':
        return [{ nameEn: 'asc' }];
      case 'popular':
        return [{ downloadEvents: { _count: 'desc' } }, { publishedAt: 'desc' }];
      case 'newest':
      default:
        return [{ publishedAt: 'desc' }, { insertedAt: 'desc' }];
    }
  }

  private mapFamilyListItem(family: FontFamily & {
    category: { name: string; slug: string } | null;
    license: { code: string; name: string } | null;
    publisher: { id: string; name: string; slug: string } | null;
    designers: Array<{ designer: { id: string; name: string } }>;
    tags: Array<{ tag: { nameEn: string } }>;
    styles: Array<{ id: string; isVariable: boolean; isDefault: boolean }>;
  }) {
    const defaultStyle = family.styles.find((style) => style.isDefault) ?? family.styles[0] ?? null;

    return {
      id: family.id,
      slug: family.slug,
      name: {
        en: family.nameEn,
        am: family.nameAm,
        native: family.nativeName,
      },
      category: family.category?.name ?? null,
      script: family.script,
      license: family.license
        ? {
            code: family.license.code,
            name: family.license.name,
          }
        : null,
      publisher: family.publisher
        ? {
            id: family.publisher.id,
            name: family.publisher.name,
          }
        : null,
      designers: family.designers.map((entry) => ({
        id: entry.designer.id,
        name: entry.designer.name,
      })),
      tags: family.tags.map((entry) => entry.tag.nameEn),
      numberOfStyles: family.styles.length,
      hasVariableStyles: family.styles.some((style) => style.isVariable),
      defaultPreviewStyleId: defaultStyle?.id ?? null,
      coverImageUrl: this.toAssetUrl(family.coverImageKey),
      publishedAt: family.publishedAt,
    };
  }

  private mapStyleDetail(style: {
    id: string;
    name: string;
    slug: string;
    weightClass: number | null;
    weightLabel: string | null;
    isItalic: boolean;
    isVariable: boolean;
    isDefault: boolean;
    format: string | null;
    fileSizeBytes: bigint | null;
    axesJson: Prisma.JsonValue | null;
    featuresJson: Prisma.JsonValue | null;
    metricsJson: Prisma.JsonValue | null;
  }) {
    return {
      id: style.id,
      name: style.name,
      slug: style.slug,
      assetUrl: this.toStyleAssetUrl(style.id),
      weightClass: style.weightClass,
      weightLabel: style.weightLabel,
      isItalic: style.isItalic,
      isVariable: style.isVariable,
      isDefault: style.isDefault,
      format: style.format,
      fileSizeBytes: Number(style.fileSizeBytes ?? 0n),
      axes: style.axesJson ?? [],
      features: style.featuresJson ?? [],
      metrics: style.metricsJson ?? {},
    };
  }

  private normalizeSearchQuery(query: string | undefined): string | undefined {
    const normalized = query?.trim();
    return normalized ? normalized : undefined;
  }

  private hashValue(value: string | null | undefined): string | null {
    const normalized = value?.trim();

    if (!normalized) {
      return null;
    }

    return createHash('sha256').update(normalized).digest('hex');
  }

  private toAssetUrl(assetKey: string | null): string | null {
    if (!assetKey) {
      return null;
    }

    const cdnBaseUrl = this.configService.get('CDN_BASE_URL', { infer: true });
    return `${cdnBaseUrl.replace(/\/+$/, '')}/${assetKey.replace(/^\/+/, '')}`;
  }

  private toStyleAssetUrl(styleId: string): string {
    const appBaseUrl = this.configService.get('APP_BASE_URL', { infer: true });
    return `${appBaseUrl.replace(/\/+$/, '')}/api/v1/assets/styles/${styleId}`;
  }
}
