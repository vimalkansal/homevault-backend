import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create predefined categories
  const predefinedCategories = [
    'Clothing',
    'Electronics',
    'Documents',
    'Kitchen',
    'Tools',
    'Books',
    'Toys',
    'Furniture',
    'Sports Equipment',
    'Office Supplies',
    'Jewelry',
    'Art & Collectibles',
    'Seasonal Items',
    'Cleaning Supplies',
    'Garden & Outdoor'
  ];

  for (const categoryName of predefinedCategories) {
    await prisma.category.upsert({
      where: { name: categoryName },
      update: {},
      create: {
        name: categoryName,
        type: 'predefined',
      },
    });
  }

  console.log(`✅ Seeded ${predefinedCategories.length} predefined categories`);
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
