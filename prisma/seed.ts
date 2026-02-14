import { PrismaClient, Role, LoanStatus, BookCondition, MessageType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting seed...');

    // ============================================
    // ADMIN USER - Always ensure admin exists
    // ============================================
    const hashedAdminPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@yomu.id' },
        update: {}, // Don't update if exists
        create: {
            email: 'admin@yomu.id',
            password: hashedAdminPassword,
            name: 'Admin Perpustakaan',
            role: Role.ADMIN,
            isActive: true,
        },
    });

    console.log('✅ Admin user ready: admin@yomu.id');

    // ============================================
    // CHECK IF DATA ALREADY EXISTS
    // Only seed initial data if database is empty
    // ============================================
    const existingBooks = await prisma.book.count();
    const existingCategories = await prisma.category.count();
    const existingMajors = await prisma.major.count();
    const existingClasses = await prisma.class.count();

    if (existingBooks > 0) {
        console.log(`ℹ️  Database sudah ada ${existingBooks} buku - skip seeding buku`);
        console.log('ℹ️  Untuk reset data, gunakan: npx prisma migrate reset');

        console.log('\n🎉 Seed completed successfully!');
        console.log('\n📋 Test Accounts:');
        console.log('   Admin: admin@yomu.id / admin123');
        return;
    }

    console.log('📦 Database kosong - seeding data awal...');

    // Create Majors (Jurusan) - only if not exists
    let majors;
    if (existingMajors === 0) {
        majors = await Promise.all([
            prisma.major.create({ data: { name: 'Rekayasa Perangkat Lunak' } }),
            prisma.major.create({ data: { name: 'Teknik Komputer Jaringan' } }),
            prisma.major.create({ data: { name: 'Multimedia' } }),
            prisma.major.create({ data: { name: 'Akuntansi' } }),
        ]);
        console.log(`✅ Created ${majors.length} majors`);
    } else {
        console.log(`ℹ️  Majors sudah ada (${existingMajors}) - skip`);
    }

    // Create Classes (Kelas) - only if not exists
    let classes;
    if (existingClasses === 0) {
        classes = await Promise.all([
            prisma.class.create({ data: { name: 'X' } }),
            prisma.class.create({ data: { name: 'XI' } }),
            prisma.class.create({ data: { name: 'XII' } }),
        ]);
        console.log(`✅ Created ${classes.length} classes`);
    } else {
        console.log(`ℹ️  Classes sudah ada (${existingClasses}) - skip`);
    }

    // Create Categories - only if not exists
    let categories;
    if (existingCategories === 0) {
        categories = await Promise.all([
            prisma.category.create({
                data: { name: 'Fiksi', color: '#FF6B6B' },
            }),
            prisma.category.create({
                data: { name: 'Non-Fiksi', color: '#4ECDC4' },
            }),
            prisma.category.create({
                data: { name: 'Akademik', color: '#45B7D1' },
            }),
            prisma.category.create({
                data: { name: 'Komik', color: '#96CEB4' },
            }),
            prisma.category.create({
                data: { name: 'Biografi', color: '#FFEAA7' },
            }),
        ]);
        console.log(`✅ Created ${categories.length} categories`);
    } else {
        categories = await prisma.category.findMany();
        console.log(`ℹ️  Categories sudah ada (${existingCategories}) - skip`);
    }

    console.log('✅ Admin user created: admin@yomu.id');

    /* 
    // Create Student Users
    const hashedStudentPassword = await bcrypt.hash('siswa123', 10);
    const students = await Promise.all([
        prisma.user.create({
            data: {
                email: 'budi@siswa.yomu.id',
                password: hashedStudentPassword,
                name: 'Budi Santoso',
                nis: '2024001',
                majorId: majors[0].id, // RPL
                classId: classes[2].id, // XII
                role: Role.SISWA,
                isActive: true,
            },
        }),
        prisma.user.create({
            data: {
                email: 'ani@siswa.yomu.id',
                password: hashedStudentPassword,
                name: 'Ani Wijaya',
                nis: '2024002',
                majorId: majors[1].id, // TKJ
                classId: classes[2].id, // XII
                role: Role.SISWA,
                isActive: true,
            },
        }),
        prisma.user.create({
            data: {
                email: 'citra@siswa.yomu.id',
                password: hashedStudentPassword,
                name: 'Citra Dewi',
                nis: '2024003',
                majorId: majors[2].id, // Multimedia
                classId: classes[1].id, // XI
                role: Role.SISWA,
                isActive: true,
            },
        }),
    ]);

    console.log(`✅ Created ${students.length} student users`);
    */
    const students: any[] = [];


    // Create Books
    const books = await Promise.all([
        prisma.book.create({
            data: {
                title: 'Laskar Pelangi',
                author: 'Andrea Hirata',
                publisher: 'Bentang Pustaka',
                year: 2005,
                isbn: '978-979-1227-93-2',
                categoryId: categories[0].id, // Fiksi
                synopsis: 'Novel tentang perjuangan anak-anak Belitung dalam menempuh pendidikan.',
                stock: 5,
                availableStock: 5,
            },
        }),
        prisma.book.create({
            data: {
                title: 'Bumi Manusia',
                author: 'Pramoedya Ananta Toer',
                publisher: 'Hasta Mitra',
                year: 1980,
                isbn: '978-602-8066-13-1',
                categoryId: categories[0].id, // Fiksi
                synopsis: 'Kisah Minke, seorang pribumi terpelajar di masa kolonial Belanda.',
                stock: 3,
                availableStock: 3,
            },
        }),
        prisma.book.create({
            data: {
                title: 'Sapiens: A Brief History of Humankind',
                author: 'Yuval Noah Harari',
                publisher: 'Harper',
                year: 2014,
                isbn: '978-0-06-231609-7',
                categoryId: categories[1].id, // Non-Fiksi
                synopsis: 'Sejarah umat manusia dari zaman prasejarah hingga modern.',
                stock: 2,
                availableStock: 2,
            },
        }),
        prisma.book.create({
            data: {
                title: 'Matematika Dasar SMA',
                author: 'Tim Penulis',
                publisher: 'Kemendikbud',
                year: 2023,
                isbn: '978-602-282-123-4',
                categoryId: categories[2].id, // Akademik
                synopsis: 'Buku pelajaran matematika untuk siswa SMA.',
                stock: 10,
                availableStock: 10,
            },
        }),
        prisma.book.create({
            data: {
                title: 'Naruto Vol. 1',
                author: 'Masashi Kishimoto',
                publisher: 'Elex Media',
                year: 2000,
                isbn: '978-979-27-1234-5',
                categoryId: categories[3].id, // Komik
                synopsis: 'Kisah Naruto Uzumaki, ninja muda yang bermimpi menjadi Hokage.',
                stock: 4,
                availableStock: 4,
            },
        }),
        prisma.book.create({
            data: {
                title: 'Steve Jobs',
                author: 'Walter Isaacson',
                publisher: 'Simon & Schuster',
                year: 2011,
                isbn: '978-1-4516-4853-9',
                categoryId: categories[4].id, // Biografi
                synopsis: 'Biografi resmi pendiri Apple Inc.',
                stock: 2,
                availableStock: 2,
            },
        }),
    ]);

    console.log(`✅ Created ${books.length} books`);

    console.log(`✅ Created ${books.length} books`);

    /*
    // Create Sample Loans
    const loan1 = await prisma.loan.create({
        data: {
            userId: students[0].id,
            bookId: books[0].id,
            loanDate: new Date(),
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            status: LoanStatus.BORROWED,
            verifiedBy: admin.id,
        },
    });

    // Update book available stock
    await prisma.book.update({
        where: { id: books[0].id },
        data: { availableStock: { decrement: 1 } },
    });

    console.log('✅ Created sample loans');
    */


    /*
    // Create Sample Favorites
    await prisma.favorite.create({
        data: {
            userId: students[0].id,
            bookId: books[1].id,
        },
    });

    await prisma.favorite.create({
        data: {
            userId: students[1].id,
            bookId: books[0].id,
        },
    });

    console.log('✅ Created sample favorites');
    */


    /*
    // Create Sample Conversation & Messages
    const conversation = await prisma.conversation.create({
        data: {
            participant1Id: students[0].id,
            participant2Id: admin.id,
        },
    });

    await prisma.message.create({
        data: {
            senderId: students[0].id,
            receiverId: admin.id,
            content: 'Halo, saya ingin menanyakan ketersediaan buku.',
            messageType: MessageType.TEXT,
        },
    });

    await prisma.message.create({
        data: {
            senderId: admin.id,
            receiverId: students[0].id,
            content: 'Halo Budi! Silakan cek di katalog atau beritahu judul bukunya.',
            messageType: MessageType.TEXT,
            isRead: true,
        },
    });

    console.log('✅ Created sample conversations and messages');
    */


    console.log('\n🎉 Seed completed successfully!');
    console.log('\n🎉 Seed completed successfully!');
    console.log('\n📋 Test Accounts:');
    console.log('   Admin: admin@yomu.id / admin123');
    // console.log('   Siswa: budi@siswa.yomu.id / siswa123');
    // console.log('   Siswa: ani@siswa.yomu.id / siswa123');
    // console.log('   Siswa: citra@siswa.yomu.id / siswa123');
}


main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
