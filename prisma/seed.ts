import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import pg from 'pg';

const databaseUrl =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/fonthabesha';
const adapter = new PrismaPg(new pg.Pool({ connectionString: databaseUrl }));
const prisma = new PrismaClient({ adapter });

async function seedLicenses(): Promise<void> {
  const licenses = [
    {
      code: 'APACHE-2.0',
      name: 'Apache License 2.0',
      summaryEn: 'Permissive license that allows redistribution and commercial use.',
      fullTextUrl: 'https://www.apache.org/licenses/LICENSE-2.0',
      allowsRedistribution: true,
      allowsCommercialUse: true,
      requiresAttribution: true,
    },
    {
      code: 'CC0-1.0',
      name: 'Creative Commons Zero 1.0',
      summaryEn: 'Public domain dedication with broad redistribution rights.',
      fullTextUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
      allowsRedistribution: true,
      allowsCommercialUse: true,
      requiresAttribution: false,
    },
    {
      code: 'OFL-1.1',
      name: 'SIL Open Font License 1.1',
      summaryEn: 'The standard open font license for redistribution and modification.',
      fullTextUrl: 'https://openfontlicense.org/open-font-license-official-text/',
      allowsRedistribution: true,
      allowsCommercialUse: true,
      requiresAttribution: true,
    },
    {
      code: 'UFL-1.0',
      name: 'Ubuntu Font License 1.0',
      summaryEn: 'Open license used by the Ubuntu font family.',
      fullTextUrl: 'https://ubuntu.com/legal/font-licence',
      allowsRedistribution: true,
      allowsCommercialUse: true,
      requiresAttribution: true,
    },
  ];

  await Promise.all(
    licenses.map((license) =>
      prisma.license.upsert({
        where: {
          code: license.code,
        },
        update: license,
        create: license,
      }),
    ),
  );
}

async function seedCategories(): Promise<void> {
  const categories = [
    { slug: 'sans-serif', name: 'Sans Serif' },
    { slug: 'serif', name: 'Serif' },
    { slug: 'display', name: 'Display' },
    { slug: 'handwriting', name: 'Handwriting' },
    { slug: 'monospace', name: 'Monospace' },
  ];

  await Promise.all(
    categories.map((category) =>
      prisma.category.upsert({
        where: {
          slug: category.slug,
        },
        update: category,
        create: category,
      }),
    ),
  );
}

async function seedContributorTerms(): Promise<void> {
  await prisma.contributorTermsVersion.upsert({
    where: {
      version: '2026-03-31-v1',
    },
    update: {
      title: 'Contributor Upload Terms v1',
      documentUrl: 'https://fonthabesha.local/legal/contributor-terms/2026-03-31-v1',
      checksum: 'fonthabesha-contributor-terms-v1',
      effectiveAt: new Date('2026-03-31T00:00:00Z'),
      isActive: true,
    },
    create: {
      version: '2026-03-31-v1',
      title: 'Contributor Upload Terms v1',
      documentUrl: 'https://fonthabesha.local/legal/contributor-terms/2026-03-31-v1',
      checksum: 'fonthabesha-contributor-terms-v1',
      effectiveAt: new Date('2026-03-31T00:00:00Z'),
      isActive: true,
    },
  });

  await prisma.contributorTermsVersion.updateMany({
    where: {
      version: {
        not: '2026-03-31-v1',
      },
    },
    data: {
      isActive: false,
    },
  });
}

async function seedUsers(): Promise<void> {
  const users = [
    {
      email: 'admin@fonthabesha.local',
      displayName: 'Fonthabesha Admin',
      passwordHash: 'dev-seed-not-for-login',
      role: UserRole.admin,
      status: UserStatus.active,
      legalFullName: 'Fonthabesha Admin',
      countryCode: 'ET',
      organizationName: 'Fonthabesha',
      phoneNumber: '+251900000000',
    },
    {
      email: 'reviewer@fonthabesha.local',
      displayName: 'Fonthabesha Reviewer',
      passwordHash: 'dev-seed-not-for-login',
      role: UserRole.reviewer,
      status: UserStatus.active,
      legalFullName: 'Fonthabesha Reviewer',
      countryCode: 'ET',
      organizationName: 'Fonthabesha',
      phoneNumber: '+251911111111',
    },
    {
      email: 'contributor@fonthabesha.local',
      displayName: 'Sample Contributor',
      passwordHash: 'dev-seed-not-for-login',
      role: UserRole.contributor,
      status: UserStatus.active,
      legalFullName: null,
      countryCode: null,
      organizationName: null,
      phoneNumber: null,
    },
  ];

  await Promise.all(
    users.map((user) =>
      prisma.user.upsert({
        where: {
          email: user.email,
        },
        update: user,
        create: user,
      }),
    ),
  );
}

async function main(): Promise<void> {
  await seedLicenses();
  await seedCategories();
  await seedContributorTerms();
  await seedUsers();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    await prisma.$disconnect();
    process.exit(1);
  });
