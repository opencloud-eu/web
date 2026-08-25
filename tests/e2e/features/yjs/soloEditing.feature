Feature: yjs single user editing
  As a user
  I want to be able to work with text documents in the text editor
  So that I can edit my documents directly in the Web UI

  Scenario: opening and editing a file in the text editor
    Given "Admin" creates following users using API
      | id    |
      | Alice |
    And "Alice" creates the following file into personal space using API
      | pathToFile | content     |
      | example.md | lorem ipsum |

    And "Alice" logs in
    And "Alice" opens the "files" app
    And "Alice" opens file "example.md" via "text-editor" using the context menu
    And "Alice" is in a text-editor
    And "Alice" enters the text "Lorem ipsum update" in editor "TextEditor"
    Then "Alice" sees the current file as dirty

    When "Alice" saves the file viewer
    Then "Alice" sees the current file as clean
    And "Alice" should see the text "Lorem ipsum update" in the text-editor

    When "Alice" reloads the page
    Then "Alice" should see the text "Lorem ipsum update" in the text-editor

    When "Alice" enters the text "Lorem ipsum another update" in editor "TextEditor"
    Then "Alice" sees the current file as dirty
    And "Alice" closes the file viewer
    And "Alice" sees the save conflict dialog and chooses the following action
      | action |
      | Save   |
    And "Alice" opens file "example.md" via "text-editor" using the context menu
    Then "Alice" should see the text "Lorem ipsum another update" in the text-editor

    When "Alice" enters the text "Replace content" in editor "TextEditor"
    Then "Alice" sees the current file as dirty
    And "Alice" closes the file viewer
    And "Alice" sees the save conflict dialog and chooses the following action
      | action     |
      | Don't Save |
    And "Alice" opens file "example.md" via "text-editor" using the context menu
    Then "Alice" should see the text "Lorem ipsum another update" in the text-editor

    And "Alice" logs out
