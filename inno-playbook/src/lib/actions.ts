import { db } from './firebase';
import {
  doc, setDoc, getDoc, collection, addDoc, getDocs, updateDoc,
  query, where, orderBy, serverTimestamp
} from 'firebase/firestore';

export interface Deliverable {
  fieldId: string;
  content: string;
  capId: string;
  orgId: string;
}

export interface Organization {
  id: string;
  name: string;
  sector: string;
  createdAt: unknown;
  deliverables: Deliverable[];
}

export async function saveOrganization(orgId: string | null, name: string, sector: string) {
  if (!name) return null;
  if (orgId) {
    await updateDoc(doc(db, 'organizations', orgId), { name, sector });
    return { id: orgId, name, sector };
  } else {
    const docRef = await addDoc(collection(db, 'organizations'), {
      name,
      sector,
      createdAt: serverTimestamp(),
    });
    return { id: docRef.id, name, sector };
  }
}

export async function saveDeliverable(orgId: string, capId: string, fieldId: string, content: string) {
  if (!orgId) return null;
  const deliverableId = `${orgId}_${fieldId}`;
  await setDoc(doc(db, 'deliverables', deliverableId), { orgId, capId, fieldId, content }, { merge: true });
  return { id: deliverableId };
}

export async function getOrganizationData(orgId: string) {
  if (!orgId) return null;
  const orgSnap = await getDoc(doc(db, 'organizations', orgId));
  if (!orgSnap.exists()) return null;

  const q = query(collection(db, 'deliverables'), where('orgId', '==', orgId));
  const delivSnap = await getDocs(q);
  const deliverables = delivSnap.docs.map(d => d.data() as Deliverable);

  return { id: orgSnap.id, ...(orgSnap.data() as Omit<Organization, 'id' | 'deliverables'>), deliverables };
}

export async function getAllOrganizations(): Promise<Organization[]> {
  const q = query(collection(db, 'organizations'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);

  const orgs: Organization[] = [];
  for (const orgDoc of snap.docs) {
    const delivQ = query(collection(db, 'deliverables'), where('orgId', '==', orgDoc.id));
    const delivSnap = await getDocs(delivQ);
    orgs.push({
      id: orgDoc.id,
      ...(orgDoc.data() as Omit<Organization, 'id' | 'deliverables'>),
      deliverables: delivSnap.docs.map(d => d.data() as Deliverable),
    });
  }
  return orgs;
}
