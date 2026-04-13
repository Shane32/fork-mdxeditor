import * as Mdast from 'mdast'
import { MdastImportVisitor } from '../../importMarkdownToLexical'
import { $createListItemSpreadParagraphNode } from './ListItemSpreadParagraphNode'

export const MdastListItemSpreadParagraphVisitor: MdastImportVisitor<Mdast.Paragraph> = {
  testNode: 'paragraph',
  // Higher priority than the core MdastParagraphVisitor so we intercept first.
  priority: 1,
  visitNode({ mdastNode, lexicalParent, mdastParent, actions }): void {
    const listItem = mdastParent as Mdast.ListItem | null
    if (lexicalParent.getType() === 'listitem' && listItem?.spread) {
      // For spread list items, the first child goes directly into the list item (no wrapper),
      // and subsequent children get a ListItemSpreadParagraphNode to preserve the paragraph structure.
      const isFirstChild = listItem.children.indexOf(mdastNode) === 0
      if (isFirstChild) {
        actions.visitChildren(mdastNode, lexicalParent)
      } else {
        actions.addAndStepInto($createListItemSpreadParagraphNode())
      }
    } else {
      actions.nextVisitor()
    }
  }
}
