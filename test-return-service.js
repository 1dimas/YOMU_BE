const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const loanId = "0721323f-45a6-42d7-9673-1a5f69eee3a5";
  console.log("Updating loan in DB directly to simulate controller call...");
  
  const dto = { reportedDamaged: true, studentNote: "Halaman 10 robek dan sampul hilang" };
  
  const updatedLoan = await prisma.loan.update({
        where: { id: loanId },
        data: {
            status: "RETURNING",
            returnDate: new Date(),
            reportedDamaged: dto.reportedDamaged || false,
            ...(dto.studentNote ? { studentNote: dto.studentNote } : {}),
        }
    });
    
  console.log("Updated result:", updatedLoan);
}
run().finally(() => prisma.$disconnect());
