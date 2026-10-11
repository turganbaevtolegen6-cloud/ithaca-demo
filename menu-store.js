import { db } from './firebase-init.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';

export const MENU_REF = doc(db, 'settings', 'menu');

// меню клиента: один раз загружаем из базы
export async function loadMenu() {
    const snap = await getDoc(MENU_REF);
    if (!snap.exists()) return null;
    return snap.data().menu || null;
}