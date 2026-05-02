import { ListNode } from '@lexical/list'
import * as Mdast from 'mdast'
import { MdastImportVisitor } from '../../importMarkdownToLexical'
import { $createExtendedListItemNode } from './ExtendedListItemNode'

export const MdastListItemVisitor: MdastImportVisitor<Mdast.ListItem> = {
  testNode: 'listItem',
  visitNode({ mdastNode, actions, lexicalParent }) {
    const isChecked = (lexicalParent as ListNode).getListType() === 'check' ? mdastNode.checked ?? false : undefined
    const listItemNode = $createExtendedListItemNode(isChecked)
    // Use addAndStepInto so that all block-level MDAST children of the listItem
    // (paragraphs, nested lists, code blocks, blockquotes, etc.) are visited
    // directly into the ExtendedListItemNode.
    actions.addAndStepInto(listItemNode)
  }
}
