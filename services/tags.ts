import db from '../db/db';

// Helper function to add tags to topics, posts, or users
async function addTags(
  entityType: 'topic' | 'post' | 'user',
  entityId: number,
  tags: string[]
): Promise<void> {
  await db.transaction(async trx => {
    for (const tagName of tags) {
      // Check if the tag already exists
      let tag = await trx('tags').where({ name: tagName }).first();

      // If the tag does not exist, insert it
      if (!tag) {
        [tag] = await trx('tags')
          .insert({ name: tagName })
          .onConflict('name')
          .merge()
          .returning('*');
      }

      // Determine the join table based on entity type
      let joinTable;
      let entityKey;
      switch (entityType) {
        case 'topic':
          joinTable = 'topic_tags';
          entityKey = 'topic_id';
          break;
        case 'post':
          joinTable = 'post_tags';
          entityKey = 'post_id';
          break;
        case 'user':
          joinTable = 'user_tags';
          entityKey = 'user_id';
          break;
      }

      // Insert the relationship in the appropriate join table
      await trx(joinTable)
        .insert({
          [entityKey]: entityId,
          tag_id: tag.id,
        })
        .onConflict([entityKey, 'tag_id'])
        .ignore();
    }
  });
}

export default addTags;
