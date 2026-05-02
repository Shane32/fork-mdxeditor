import { COMMAND_PRIORITY_NORMAL, DELETE_CHARACTER_COMMAND, INSERT_PARAGRAPH_COMMAND, LexicalEditor } from 'lexical'
import { mergeRegister } from '@lexical/utils'
import { $handleExtendedListItemInsertParagraph } from './ExtendedListItemEnterHandler'
import { $handleExtendedListItemDeleteCharacter } from './ExtendedListItemBackspaceHandler'

// ---------------------------------------------------------------------------
// Command registration
// ---------------------------------------------------------------------------

/**
 * Registers the keyboard command handlers for ExtendedListItemNode.
 * Must be called with COMMAND_PRIORITY_NORMAL so it runs before the
 * ListPlugin's COMMAND_PRIORITY_LOW handlers.
 */
export function registerExtendedListItemCommands(editor: LexicalEditor): () => void {
  return mergeRegister(
    editor.registerCommand(INSERT_PARAGRAPH_COMMAND, () => $handleExtendedListItemInsertParagraph(), COMMAND_PRIORITY_NORMAL),
    editor.registerCommand(
      DELETE_CHARACTER_COMMAND,
      (isBackward: boolean) => {
        if (!isBackward) return false
        return $handleExtendedListItemDeleteCharacter()
      },
      COMMAND_PRIORITY_NORMAL
    )
  )
}
