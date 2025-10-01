"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { contactSchema, ContactFormData } from "@/lib/validations/contact";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getContacts(search?: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const contacts = await prisma.contact.findMany({
    where: {
      ownerId: session.user.id,
      ...(search && {
        OR: [
          { name: { contains: search } },
          { email: { contains: search } },
        ],
      }),
    },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return contacts;
}

export async function getContactById(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const contact = await prisma.contact.findFirst({
    where: {
      id,
      ownerId: session.user.id,
    },
    include: {
      organization: true,
      deals: {
        include: {
          stage: {
            select: {
              name: true,
            },
          },
        },
      },
      activities: {
        orderBy: {
          dueDate: "desc",
        },
      },
    },
  });

  return contact;
}

export async function createContact(data: ContactFormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const validated = contactSchema.parse(data);

  const contact = await prisma.contact.create({
    data: {
      name: validated.name,
      email: validated.email || null,
      phone: validated.phone || null,
      organizationId: validated.organizationId || null,
      ownerId: session.user.id,
    },
  });

  revalidatePath("/contacts");
  return contact;
}

export async function updateContact(id: string, data: ContactFormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const validated = contactSchema.parse(data);

  const contact = await prisma.contact.update({
    where: {
      id,
      ownerId: session.user.id,
    },
    data: {
      name: validated.name,
      email: validated.email || null,
      phone: validated.phone || null,
      organizationId: validated.organizationId || null,
    },
  });

  revalidatePath("/contacts");
  revalidatePath(`/contacts/${id}`);
  return contact;
}

export async function deleteContact(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  await prisma.contact.delete({
    where: {
      id,
      ownerId: session.user.id,
    },
  });

  revalidatePath("/contacts");
}
