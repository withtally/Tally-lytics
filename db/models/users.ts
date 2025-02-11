import db from '../db';

export async function insertUser(user: any): Promise<void> {
  await db('users').insert(user).onConflict('id').merge();
}

export async function getUserByUsername(username: string): Promise<any> {
  return db('users').where({ username }).first();
}
