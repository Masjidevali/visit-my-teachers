import { db } from '@/db';
import { activityLog } from '@/db/schema';

export async function logActivity(action: string, detail: string = '') {
  await db.insert(activityLog).values({ action, detail }).catch(() => {});
}
