import { $createParagraphNode, $getSelection, $isElementNode, $isRangeSelection, $isRootOrShadowRoot, LexicalNode } from 'lexical'
import { $isListItemNode, $isListNode, ListNode } from '@lexical/list'
import { $isParagraphNode } from 'lexical'
import { $createExtendedListItemNode, ExtendedListItemNode } from './ExtendedListItemNode'
import { $findParagraphInListItem } from './ExtendedListItemHelpers'

// ---------------------------------------------------------------------------
// Backspace objectives for ExtendedListItemNode
//
//   1. Cursor at the start of the first paragraph of the first list item, at
//      root level → pressing Backspace converts the list item to a root-level
//      paragraph (lifts all block children out of the list).
//      [Handled by collapseAtStart override on ExtendedListItemNode]
//   2. Cursor at the start of the first paragraph of the first list item, when
//      nested inside another list item → pressing Backspace outdents (lifts
//      block children into the grandparent list item, removes the nested list
//      item).
//      [Handled by collapseAtStart override on ExtendedListItemNode]
//   3. Cursor at the start of the first paragraph of a non-first list item →
//      pressing Backspace merges the current list item into the previous one
//      (appends all its children to the previous list item).
//      [Handled by collapseAtStart override on ExtendedListItemNode]
//   4. Cursor at the start of a second (or later) empty paragraph inside a
//      list item → pressing Backspace removes the empty paragraph and creates
//      a new empty list item after the current one, placing the cursor there.
//   5. Cursor at the start of a second (or later) non-empty paragraph inside a
//      list item → let default behaviour handle it (merge paragraphs).
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Core backspace logic for the FIRST paragraph of an ExtendedListItemNode
// (Objectives 1, 2, 3 — called via collapseAtStart on ExtendedListItemNode)
// ---------------------------------------------------------------------------

/**
 * Handles backspace when the cursor is at the start of the FIRST paragraph
 * of an ExtendedListItemNode (i.e., collapseAtStart was triggered on the
 * list item itself).
 *
 * Returns true if handled.
 */
export function $collapseExtendedListItemAtStart(listItem: ExtendedListItemNode): true {
  const listNode = listItem.getParent()! as ListNode
  const grandparent = listNode.getParent()
  const prevListItem = listItem.getPreviousSibling()

  // Get the first paragraph (the one the cursor is in)
  const firstParagraph = listItem.getFirstChild()

  if (prevListItem === null) {
    // First list item in the list
    if ($isRootOrShadowRoot(grandparent)) {
      // Objective 1: Lift all block children to root level.
      // IMPORTANT: move nodes BEFORE removing listItem, otherwise Lexical
      // removes children along with the parent.

      // Snapshot children before mutations
      const listItemChildren = listItem.getChildren()

      // Build a root-level paragraph from the first paragraph's inline children
      const newParagraph = $createParagraphNode()
      if ($isParagraphNode(firstParagraph)) {
        for (const inlineChild of firstParagraph.getChildren()) {
          newParagraph.append(inlineChild)
        }
      }
      // Insert the new paragraph before the list
      listNode.insertBefore(newParagraph)

      // Move remaining block children (skip the first paragraph) to root level
      let insertAfter: LexicalNode = newParagraph
      for (const child of listItemChildren) {
        if ($isParagraphNode(firstParagraph) && child.is(firstParagraph)) continue
        insertAfter.insertAfter(child)
        insertAfter = child
      }

      // Remove the list item (now only contains the empty first paragraph)
      listItem.remove()
      if (listNode.getChildrenSize() === 0) {
        listNode.remove()
      }

      newParagraph.selectStart()
    } else if ($isListItemNode(grandparent)) {
      // Objective 2: Outdent — lift block children into the grandparent list item.
      const listItemChildren = listItem.getChildren()

      // Insert block children before the nested list node
      let insertBefore: LexicalNode = listNode
      for (const child of listItemChildren) {
        insertBefore.insertBefore(child)
        insertBefore = child
      }

      listItem.remove()
      if (listNode.getChildrenSize() === 0) {
        listNode.remove()
      }

      // Select start of the first lifted child
      if ($isElementNode(listItemChildren[0])) {
        listItemChildren[0].selectStart()
      }
    } else {
      // Fallback: just remove the list item
      listItem.remove()
    }
  } else if ($isListItemNode(prevListItem)) {
    // Objective 3: Merge with previous list item
    const children = listItem.getChildren()
    prevListItem.selectEnd()
    for (const child of children) {
      prevListItem.append(child)
    }
    listItem.remove()
  } else {
    listItem.remove()
  }

  return true
}

// ---------------------------------------------------------------------------
// Backspace key handler (Objectives 4, 5)
// ---------------------------------------------------------------------------

/**
 * Handles DELETE_CHARACTER_COMMAND (backward = Backspace) when the cursor is
 * at offset 0 of a paragraph that is a direct child of an ExtendedListItemNode.
 *
 * Returns true if handled, false to let the default handler run.
 */
export function $handleExtendedListItemDeleteCharacter(): boolean {
  const selection = $getSelection()
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
    return false
  }

  const anchor = selection.anchor
  if (anchor.offset !== 0) {
    return false
  }

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

  const prevParagraphSibling = paragraph.getPreviousSibling()
  const isFirstParagraph = prevParagraphSibling === null || $isListNode(prevParagraphSibling)

  if (isFirstParagraph) {
    // Objectives 1, 2, 3 are handled by collapseAtStart on ExtendedListItemNode.
    // Return false to let the default deleteCharacter run, which will call
    // $collapseAtStart → ParagraphNode.collapseAtStart (returns false) →
    // ExtendedListItemNode.collapseAtStart (our override).
    return false
  }

  // Cursor is at the start of a non-first paragraph
  const isParagraphEmpty = paragraph.getTextContent().trim() === '' && paragraph.getChildrenSize() === 0

  if (isParagraphEmpty) {
    // Objective 4: Remove the empty paragraph, create a new empty list item
    // after the current list item, and place the cursor there.
    paragraph.remove()
    const newListItem = $createExtendedListItemNode()
    const newParagraph = $createParagraphNode()
    newListItem.append(newParagraph)
    listItem.insertAfter(newListItem)
    newParagraph.selectStart()
    return true
  }

  // Objective 5: Let default behaviour handle it (merge paragraphs)
  return false
}
