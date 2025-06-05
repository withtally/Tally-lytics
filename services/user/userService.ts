// services/users/userService.ts
import { Logger } from '../logging';
import { loggerConfig } from '../../config/loggerConfig';
import db from '../../db/db';

export interface DiscourseUser {
  id: number;
  username: string;
  forum_name?: string; // Make forum_name optional in the interface
  name?: string;
  avatar_template?: string;
  created_at: string;
  updated_at: string;
  last_seen_at?: string;
  website?: string;
  location?: string;
  bio?: string;
  moderator?: boolean;
  admin?: boolean;
}

export interface DiscourseUserResponse {
  user: {
    id: number;
    username: string;
    name: string;
    avatar_template: string;
    created_at: string;
    last_seen_at: string;
    website: string;
    location: string;
    bio_raw: string;
    moderator: boolean;
    admin: boolean;
  };
}

export class UserService {
  private logger: Logger;
  private isConnected: boolean = false;

  constructor() {
    this.logger = new Logger({
      ...loggerConfig,
      logFile: 'logs/user-service.log',
    });

    // Check database connection
    this.checkDatabaseConnection();
  }

  private async checkDatabaseConnection(): Promise<void> {
    try {
      await db.raw('SELECT 1');
      this.isConnected = true;
    } catch (error) {
      this.logger.warn('Database not available - UserService running in limited mode');
      this.isConnected = false;
    }
  }

  async fetchUserDetails(
    username: string,
    forumUrl: string,
    apiKey: string,
    apiUsername: string
  ): Promise<DiscourseUser | null> {
    try {
      this.logger.info(`Fetching user details for ${username}`);

      if (!forumUrl || !apiKey || !apiUsername) {
        throw new Error('Missing required API configuration');
      }

      const response = await fetch(`${forumUrl}/users/${username}.json`, {
        headers: {
          'Api-Key': apiKey,
          'Api-Username': apiUsername,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          this.logger.warn(`User ${username} not found`);
          return null;
        }
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as DiscourseUserResponse;

      const user: DiscourseUser = {
        id: data.user.id,
        username: data.user.username,
        name: data.user.name,
        avatar_template: data.user.avatar_template,
        created_at: data.user.created_at,
        updated_at: new Date().toISOString(),
        last_seen_at: data.user.last_seen_at,
        website: data.user.website,
        location: data.user.location,
        bio: data.user.bio_raw,
        moderator: data.user.moderator,
        admin: data.user.admin,
      };

      return user;
    } catch (error: any) {
      this.logger.error(`Error fetching user details for ${username}:`, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async upsertUser(user: DiscourseUser, forumName: string): Promise<void> {
    if (!this.isConnected) {
      this.logger.debug(`Skipping user upsert for ${user.username} - database not connected`);
      return;
    }

    try {
      if (!user.id || !user.username) {
        throw new Error('Missing required user data: id or username');
      }

      const userData = {
        ...user,
        forum_name: forumName,
        updated_at: new Date().toISOString(),
      };

      await db('users').insert(userData).onConflict(['id', 'forum_name']).merge();

      this.logger.info(`Successfully upserted user ${user.username} for forum ${forumName}`);
    } catch (error: any) {
      this.logger.error(`Error upserting user ${user.username}:`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        forum: forumName,
      });
      throw error;
    }
  }

  async getUserByUsername(username: string, forumName: string): Promise<DiscourseUser | null> {
    try {
      if (!username || !forumName) {
        throw new Error('Username and forum name are required');
      }

      const user = await db('users')
        .where({
          username: username,
          forum_name: forumName,
        })
        .first();

      return user || null;
    } catch (error: any) {
      this.logger.error(`Error fetching user ${username}:`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        forum: forumName,
      });
      throw error;
    }
  }
}

export default new UserService();
