import { $createListNode, $isListItemNode } from '@lexical/list'
import { ElementNode } from 'lexical'
import * as Mdast from 'mdast'
import { MdastImportVisitor } from '../../importMarkdownToLexical'

export const MdastListVisitor: MdastImportVisitor<Mdast.List> = {
  testNode: 'list',
  visitNode: function ({ mdastNode, lexicalParent, actions }): void {
    const listType = mdastNode.children.some((e) => typeof e.checked === 'boolean') ? 'check' : mdastNode.ordered ? 'number' : 'bullet'
    const lexicalNode = $createListNode(listType)

    // Append the ListNode directly to the parent (ListItemNode or root-level ElementNode).
    // ListItemNode can contain block-level children including nested ListNodes.
    ;(lexicalParent as ElementNode).append(lexicalNode)

    actions.visitChildren(mdastNode, lexicalNode)
  }
}
