import { $createParagraphNode, $getSelection, $isElementNode, $isRangeSelection, $isRootOrShadowRoot, LexicalNode } from 'lexical'
import { $isListItemNode, $isListNode, ListNode } from '@lexical/list'
import { $isParagraphNode } from 'lexical'
import { ExtendedListItemNode } from './ExtendedListItemNode'
import { $findParagraphInListItem } from './ExtendedListItemHelpers'

// ---------------------------------------------------------------------------
// Backspace objectives for ExtendedListItemNode
//
//   1. Cursor at the start of the first paragraph of the first list item, at
//      root level → pressing Backspace converts the list item to a root-level
//      paragraph (lifts all block children out of the list).
//   2. Cursor at the start of the first paragraph of the first list item, when
//      nested inside another list item → pressing Backspace outdents (lifts
//      block children into the grandparent list item, removes the nested list
//      item).
//   3. Cursor at the start of the first paragraph of a non-first list item →
//      pressing Backspace removes the current list item, moves the content of
//      the first paragraph into a new paragraph appended to the previous list
//      item, and places the cursor at the start of that new paragraph.
//   4. Cursor at the start of a second (or later) empty paragraph inside a
//      list item → pressing Backspace removes the empty paragraph and moves
//      the cursor to the end of the previous paragraph.
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

      // Insert block children before the nested list node, preserving order.
      // Use insertAfter with a running pointer anchored at the node before listNode,
      // or fall back to inserting in reverse before listNode if it is the first child.
      const anchorBefore = listNode.getPreviousSibling()
      if (anchorBefore !== null) {
        let insertAfter: LexicalNode = anchorBefore
        for (const child of listItemChildren) {
          insertAfter.insertAfter(child)
          insertAfter = child
        }
      } else {
        for (const child of [...listItemChildren].reverse()) {
          listNode.insertBefore(child)
        }
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
    // Objective 3: Remove the current list item, move the content of the first
    // paragraph into a new paragraph appended to the previous list item, and
    // place the cursor at the start of that new paragraph.
    const newParagraph = $createParagraphNode()
    if ($isParagraphNode(firstParagraph)) {
      for (const inlineChild of firstParagraph.getChildren()) {
        newParagraph.append(inlineChild)
      }
    }
    prevListItem.append(newParagraph)
    listItem.remove()
    newParagraph.selectStart()
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
  const isParagraphEmpty = paragraph.getChildrenSize() === 0

  if (isParagraphEmpty) {
    // Objective 4: Remove the empty paragraph and move the cursor to the end
    // of the previous sibling paragraph.
    paragraph.remove()
    if ($isElementNode(prevParagraphSibling)) {
      prevParagraphSibling.selectEnd()
    }
    return true
  }

  // Objective 5: Let default behaviour handle it (merge paragraphs)
  return false
}
