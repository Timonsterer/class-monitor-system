import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore'

import { db } from '@/firebase'

const COLLECTION_NAME = 'schedules'

export async function getSchedules() {
  const q = query(
    collection(db, COLLECTION_NAME),
    orderBy('date', 'asc'),
    orderBy('startTime', 'asc')
  )

  const snapshot = await getDocs(q)

  return snapshot.docs.map(docSnap => ({
    id: docSnap.id,
    ...docSnap.data()
  }))
}

export async function addSchedule(data) {
  return await addDoc(collection(db, COLLECTION_NAME), {
    ...data,
    studentOnline: data.studentOnline || false,
    teacherOnline: data.teacherOnline || false,
    classStarted: data.classStarted || false,
    classCompleted: data.classCompleted || false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  })
}

export async function importSchedules(list) {
  const batch = writeBatch(db)

  list.forEach(item => {
    const ref = doc(collection(db, COLLECTION_NAME))

    batch.set(ref, {
      ...item,
      studentOnline: item.studentOnline || false,
      teacherOnline: item.teacherOnline || false,
      classStarted: item.classStarted || false,
      classCompleted: item.classCompleted || false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
  })

  await batch.commit()
}

export async function updateSchedule(id, data) {
  const ref = doc(db, COLLECTION_NAME, id)

  await updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp()
  })
}

export async function deleteSchedule(id) {
  const ref = doc(db, COLLECTION_NAME, id)
  await deleteDoc(ref)
}

export async function deleteAllSchedules() {
  const snapshot = await getDocs(collection(db, COLLECTION_NAME))
  const batch = writeBatch(db)

  snapshot.docs.forEach(docSnap => {
    batch.delete(doc(db, COLLECTION_NAME, docSnap.id))
  })

  await batch.commit()
}

export async function removeDuplicateSchedules() {
  const snapshot = await getDocs(collection(db, COLLECTION_NAME))
  const map = new Map()
  const batch = writeBatch(db)

  snapshot.docs.forEach(docSnap => {
    const item = docSnap.data()

    const key = [
      item.date || '',
      item.startTime || '',
      item.endTime || '',
      item.schoolName || '',
      item.teacherName || '',
      item.studentName || '',
      item.courseTitle || item.courseName || '',
      item.meetUrl || ''
    ].join('|')

    if (map.has(key)) {
      batch.delete(doc(db, COLLECTION_NAME, docSnap.id))
    } else {
      map.set(key, true)
    }
  })

  await batch.commit()
}