Feature: yjs collaborative editing
  As a user
  I want the text editor to relay my edits to everyone viewing the same file
  So that documents can be edited collaboratively in real time

  Scenario: collaborative editing
    Given "Admin" creates following users using API
      | id    |
      | Alice |
      | Brian |
      | Carol |
    And "Alice" creates the following file into personal space using API
      | pathToFile | content     |
      | example.md | lorem ipsum |
    And "Alice" shares the following resources using API
      | resource   | recipient | type | role     |
      | example.md | Brian     | user | Can edit |
      | example.md | Carol     | user | Can view |

    And "Brian" logs in
    And "Brian" navigates to the shared with me page
    And "Brian" opens file "example.md" via "text-editor" using the context menu
    And "Brian" is in a text-editor

    And "Carol" logs in
    And "Carol" navigates to the shared with me page
    And "Carol" opens file "example.md" via "text-editor" using the context menu
    And "Carol" is in a text-editor

    And "Alice" logs in
    And "Alice" opens the "files" app
    And "Alice" opens file "example.md" via "text-editor" using the context menu
    And "Alice" is in a text-editor

    When "Alice" enters the text "collaborative hello" in editor "TextEditor"
    Then "Brian" should see the text "collaborative hello" in the text-editor
    And "Carol" should see the text "collaborative hello" in the text-editor

    When "Brian" enters the text "Brian says hello" in editor "TextEditor"
    Then "Alice" should see the text "Brian says hello" in the text-editor
    And "Carol" should see the text "Brian says hello" in the text-editor

    And "Alice" logs out
    And "Brian" logs out
    And "Carol" logs out
