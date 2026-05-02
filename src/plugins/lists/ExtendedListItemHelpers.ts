import { $isRootOrShadowRoot, LexicalNode, ParagraphNode } from 'lexical'
import { $isListItemNode, ListItemNode, ListNode } from '@lexical/list'
import { $isParagraphNode } from 'lexical'

/**
 * Walks up from `node` to find the nearest ParagraphNode that is a direct
 * child of a ListItemNode (or subclass). Returns null if not found.
 */
export function $findParagraphInListItem(node: LexicalNode): { paragraph: ParagraphNode; listItem: ListItemNode } | null {
  let current: LexicalNode = node
  let parent = current.getParent()
  while (parent !== null && !$isRootOrShadowRoot(parent)) {
    if ($isListItemNode(parent) && $isParagraphNode(current)) {
      return { paragraph: current as ParagraphNode, listItem: parent }
    }
    current = parent
    parent = current.getParent()
  }
  return null
}

/**
 * Returns the top-most ListNode ancestor of a list item.
 */
export function $getTopListNode(listItem: LexicalNode): ListNode {
  let list = listItem.getParent()! as ListNode
  let parent = list.getParent()
  while ($isListItemNode(parent)) {
    list = parent.getParent()! as ListNode
    parent = list.getParent()
  }
  return list
}
