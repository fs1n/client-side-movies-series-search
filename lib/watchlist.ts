import { databases, account } from './appwrite';
import { Query, ID } from 'appwrite';
import { MediaItem } from '../types';
import { parseAppwriteError } from './appwriteErrorHandler';
import { WATCHLIST_PERMISSIONS } from './appwriteRowSecurity';

const DB_ID = 'csmss-prod';
const COLLECTION_ID = 'watchlist';
const MIGRATION_FLAG_KEY = 'watchlist_migrated';

/**
 * Watchlist document structure (no JSON field)
 * All data is stored as individual attributes for maximum compatibility and security
 */
export interface WatchlistDocument {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  userId: string;
  mediaId: number;
  mediaType: 'movie' | 'tv';
  title: string;
  posterPath?: string;
  addedAt: string; // ISO datetime, immutable
}

/**
 * Loads all watchlist items for the authenticated user from Appwrite
 * Row-level security ensures only the owner's data is returned
 */
export const loadUserWatchlist = async (userId: string): Promise<MediaItem[]> => {
  try {
    const response = await databases.listDocuments(
      DB_ID,
      COLLECTION_ID,
      [
        Query.equal('userId', userId),
        Query.orderDesc('addedAt'),
        Query.limit(1000) // Reasonable limit for watchlist size
      ]
    );
    
    return response.documents.map((doc: any) => ({
      id: doc.mediaId,
      title: doc.title,
      name: doc.title, // For TV series compatibility
      poster_path: doc.posterPath || null,
      backdrop_path: null,
      overview: '',
      media_type: doc.mediaType,
      release_date: '',
      first_air_date: '',
      vote_average: 0,
      genre_ids: []
    }));
  } catch (error) {
    const appwriteError = parseAppwriteError(error);
    console.error('Failed to load watchlist from Appwrite:', appwriteError.message);
    return [];
  }
};

/**
 * Adds a media item to the user's watchlist in Appwrite
 * Row-level permissions auto-lock document to owner via $userId placeholder
 * Prevents duplicates via unique index (userId, mediaId)
 */
export const addToWatchlist = async (userId: string, media: MediaItem): Promise<MediaItem | null> => {
  try {
    // Validation
    if (!media.id || !media.media_type) {
      throw new Error('Invalid media object: missing id or media_type');
    }

    // The unique index on (userId, mediaId) will reject duplicates automatically
    // $userId is a special placeholder that Appwrite replaces with the authenticated user's ID
    const doc = await databases.createDocument(
      DB_ID,
      COLLECTION_ID,
      ID.unique(),
      {
        userId,
        mediaId: media.id,
        mediaType: media.media_type,
        title: media.title || media.name || 'Unknown',
        posterPath: media.poster_path || '',
        addedAt: new Date().toISOString()
      },
      WATCHLIST_PERMISSIONS.ownerOnly
    );

    return {
      id: (doc as any).mediaId,
      title: (doc as any).title,
      name: (doc as any).title,
      poster_path: (doc as any).posterPath || null,
      backdrop_path: null,
      overview: '',
      media_type: (doc as any).mediaType,
      release_date: '',
      first_air_date: '',
      vote_average: 0,
      genre_ids: []
    };
  } catch (error: any) {
    const appwriteError = parseAppwriteError(error);
    
    // Handle duplicate entry (409 Conflict)
    if (error.code === 409 || appwriteError.code === 409) {
      console.warn('Item already in watchlist, skipping duplicate');
      return media;
    }
    
    console.error('Failed to add to watchlist:', appwriteError.message);
    return null;
  }
};

/**
 * Removes a media item from the user's watchlist
 * Row-level security ensures only owner can delete
 */
export const removeFromWatchlist = async (userId: string, mediaId: number): Promise<boolean> => {
  try {
    const existing = await databases.listDocuments(
      DB_ID,
      COLLECTION_ID,
      [
        Query.equal('userId', userId),
        Query.equal('mediaId', mediaId),
        Query.limit(1)
      ]
    );

    if (existing.documents.length === 0) {
      console.warn('Item not found in watchlist');
      return false;
    }

    const docId = existing.documents[0].$id;
    
    // Row-level security: user can only delete their own documents
    await databases.deleteDocument(
      DB_ID,
      COLLECTION_ID,
      docId
    );
    return true;
  } catch (error) {
    const appwriteError = parseAppwriteError(error);
    console.error('Failed to remove from watchlist:', appwriteError.message);
    return false;
  }
};

/**
 * Migrates local watchlist items to Appwrite on first login
 * Uses Appwrite user prefs to track migration status (idempotent)
 */
export const migrateLocalWatchlist = async (userId: string, localItems: MediaItem[]): Promise<void> => {
  try {
    const user = await account.get();
    const prefs = (user.prefs as Record<string, any>) || {};
    
    // Check if already migrated
    if (prefs[MIGRATION_FLAG_KEY]) {
      console.log('Watchlist already migrated, skipping');
      return;
    }

    if (localItems.length === 0) {
      // Mark as migrated even if empty
      await account.updatePrefs({ ...prefs, [MIGRATION_FLAG_KEY]: true });
      return;
    }

    console.log(`Migrating ${localItems.length} items to Appwrite...`);
    
    // Migrate each item with error tolerance
    for (const item of localItems) {
      try {
        await addToWatchlist(userId, item);
      } catch (itemError) {
        console.warn(`Failed to migrate item ${item.id}:`, itemError);
        // Continue with next item instead of failing entire migration
      }
    }

    // Mark migration as complete
    await account.updatePrefs({ ...prefs, [MIGRATION_FLAG_KEY]: true });
    console.log('Watchlist migration completed');
  } catch (error) {
    const appwriteError = parseAppwriteError(error);
    console.error('Migration failed:', appwriteError.message);
    throw error;
  }
};

/**
 * Clears all watchlist items for a user (logout cleanup)
 * Row-level security ensures only owner's items are deleted
 */
export const clearUserWatchlist = async (userId: string): Promise<void> => {
  try {
    const response = await databases.listDocuments(
      DB_ID,
      COLLECTION_ID,
      [
        Query.equal('userId', userId),
        Query.limit(1000)
      ]
    );

    for (const doc of response.documents) {
      try {
        await databases.deleteDocument(
          DB_ID,
          COLLECTION_ID,
          doc.$id
        );
      } catch (deleteError) {
        console.warn(`Failed to delete document ${doc.$id}:`, deleteError);
      }
    }
    
    console.log('Watchlist cleared');
  } catch (error) {
    const appwriteError = parseAppwriteError(error);
    console.error('Failed to clear watchlist:', appwriteError.message);
  }
};