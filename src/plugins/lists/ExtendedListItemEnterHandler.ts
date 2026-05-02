import {
  $createParagraphNode,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isRootOrShadowRoot,
  $isTextNode,
  LexicalNode
} from 'lexical'
import { $createListItemNode, $createListNode, $isListItemNode, $isListNode } from '@lexical/list'
import { ExtendedListItemNode } from './ExtendedListItemNode'
import { $findParagraphInListItem, $getTopListNode } from './ExtendedListItemHelpers'

// ---------------------------------------------------------------------------
// Enter key handler
// ---------------------------------------------------------------------------

/**
 * Handles INSERT_PARAGRAPH_COMMAND (Enter key) when the cursor is inside a
 * paragraph that is a direct child of an ExtendedListItemNode.
 *
 * Objectives:
 *   1. Cursor in a list item with text → pressing Enter creates a new list item
 *      after the current one.
 *   2. Cursor mid-text in a list item → pressing Enter splits the text: current
 *      item keeps text before cursor, new item gets text after cursor.
 *   3. Cursor in an empty list item (only child, no other blocks) → pressing Enter
 *      exits the list and creates a paragraph after the list.
 *   4. Cursor in an empty list item that is nested (inside another list item) →
 *      pressing Enter creates a new list item at the parent level (outdents).
 *
 * Returns true if handled, false to let the default handler run.
 */
export function $handleExtendedListItemInsertParagraph(): boolean {
  const selection = $getSelection()
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
    return false
  }

  const anchor = selection.anchor
  const anchorNode = anchor.getNode()

  const found = $findParagraphInListItem(anchorNode)
  if (found === null || !(found.listItem instanceof ExtendedListItemNode)) {
    return false
  }
  const { paragraph, listItem } = found

  const listNode = listItem.getParent()
  if (!$isListNode(listNode)) {
    return false
  }

  // Check if this paragraph is empty
  const isParagraphEmpty = paragraph.getTextContent().trim() === '' && paragraph.getChildrenSize() === 0

  // Count non-list block children of the list item
  const blockChildren = listItem.getChildren().filter((c) => !$isListNode(c))
  const isOnlyBlockChild = blockChildren.length === 1 && blockChildren[0].is(paragraph)

  if (isParagraphEmpty && isOnlyBlockChild) {
    // "Exit" the list item — same logic as $handleListInsertParagraph
    const topListNode = $getTopListNode(listItem)
    const grandparent = listNode.getParent()

    let replacementNode: LexicalNode
    if ($isRootOrShadowRoot(grandparent)) {
      replacementNode = $createParagraphNode()
      topListNode.insertAfter(replacementNode)
    } else if ($isListItemNode(grandparent)) {
      replacementNode = $createListItemNode()
      grandparent.insertAfter(replacementNode)
    } else {
      return false
    }

    // Move focus to the replacement node
    if ($isElementNode(replacementNode)) {
      replacementNode.select(0, 0)
    }

    // Handle any next siblings of the current list item
    const nextSiblings = listItem.getNextSiblings()
    if (nextSiblings.length > 0) {
      const newList = $createListNode(listNode.getListType())
      if ($isListItemNode(replacementNode)) {
        const newListItem = $createListItemNode()
        newListItem.append(newList)
        replacementNode.insertAfter(newListItem)
      } else {
        replacementNode.insertAfter(newList)
      }
      newList.append(...nextSiblings)
    }

    // Remove the now-empty list item
    listItem.remove()

    // Clean up empty list
    if (listNode.getChildrenSize() === 0) {
      listNode.remove()
    }

    return true
  }

  // Normal case: split the list item at the current paragraph boundary.
  // Create a new ExtendedListItemNode after the current one.
  const newListItem = new ExtendedListItemNode(listItem.__value, listItem.__checked)
  newListItem.setChecked(listItem.getChecked() ? false : undefined)
  listItem.insertAfter(newListItem)

  // Everything after the current paragraph (siblings of paragraph in the list item)
  // will move to the new list item.
  const paragraphSiblingsAfter = paragraph.getNextSiblings()

  // Create a new paragraph in the new list item for content after the cursor
  const newParagraph = $createParagraphNode()
  newListItem.append(newParagraph)

  // Split content at the cursor position
  if (anchor.type === 'element') {
    // Cursor is at element level within the paragraph — move children after offset
    const paraChildren = paragraph.getChildren()
    const childrenToMove = paraChildren.slice(anchor.offset)
    for (const child of childrenToMove) {
      newParagraph.append(child)
    }
  } else if ($isTextNode(anchorNode)) {
    // Cursor is inside a text node
    const offset = anchor.offset
    const textSize = anchorNode.getTextContentSize()
    if (offset > 0 && offset < textSize) {
      // Split the text node at the cursor; splitText always returns [before, after]
      // when offset is strictly between 0 and textSize.
      const [, afterNode] = anchorNode.splitText(offset)
      let sibling: LexicalNode | null = afterNode
      while (sibling !== null) {
        const next: LexicalNode | null = sibling.getNextSibling()
        newParagraph.append(sibling)
        sibling = next
      }
    } else if (offset === 0) {
      // Cursor at start of text node — move this and all following siblings
      let sibling: LexicalNode | null = anchorNode
      while (sibling !== null) {
        const next: LexicalNode | null = sibling.getNextSibling()
        newParagraph.append(sibling)
        sibling = next
      }
    }
    // If offset === end of text, nothing moves (cursor at end of paragraph)
  }

  // Move any block children after the current paragraph to the new list item
  for (const sibling of paragraphSiblingsAfter) {
    newListItem.append(sibling)
  }

  // Select the start of the new paragraph
  newParagraph.selectStart()

  return true
}
