import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { calculateDocumentStatus } from "@/lib/documents/status";
import { DocumentListClient, DocumentListItem } from "@/components/documents/DocumentListClient";

export default async function DocumentsPage() {
  const user = await requireUser();

  // Scoped query strictly for authenticated user
  const rawDocuments = await prisma.document.findMany({
    where: { userId: user.id },
    include: {
      files: {
        select: {
          id: true,
          fileName: true,
          fileType: true,
          fileSize: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const documents: DocumentListItem[] = rawDocuments.map((doc) => {
    const statusInfo = calculateDocumentStatus(doc.expiryDate);
    return {
      id: doc.id,
      title: doc.title,
      category: doc.category,
      documentNumber: doc.documentNumber,
      issuedBy: doc.issuedBy,
      issueDate: doc.issueDate ? doc.issueDate.toISOString() : null,
      expiryDate: doc.expiryDate ? doc.expiryDate.toISOString() : null,
      hasExpiry: doc.hasExpiry,
      notes: doc.notes,
      createdAt: doc.createdAt.toISOString(),
      statusInfo,
      files: doc.files,
    };
  });

  return <DocumentListClient initialDocuments={documents} />;
}
