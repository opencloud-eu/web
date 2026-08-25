Feature: yjs public editing
  As a user accessing a public link
  I can view or edit a publicly shared file without having collaborative features

  Scenario: public viewer opens a text file
    Given "Admin" creates following users using API
      | id    |
      | Alice |
    And "Alice" creates the following file into personal space using API
      | pathToFile | content     |
      | example.md | lorem ipsum |

    And "Alice" logs in
    And "Alice" opens the "files" app
    And "Alice" creates a public link of following resource using the sidebar panel
      | resource     | password |
      | example.md   | %public% |

    When "Anonymous" opens the public link "Unnamed link"
    And "Anonymous" unlocks the public link with password "%public%"
    And "Anonymous" is in a text-editor
    And "Anonymous" should see the text "lorem ipsum" in the text-editor
    Then "Anonymous" should not be able to edit the current file

    When "Alice" opens file "example.md" via "text-editor" using the context menu
    And "Alice" enters the text "Alice says hello" in editor "TextEditor"
    Then "Anonymous" should see the text "lorem ipsum" in the text-editor

    When "Anonymous" reloads the page
    Then "Anonymous" should see the text "lorem ipsum" in the text-editor

    And "Alice" logs out

  Scenario: public editor opens a text file
    Given "Admin" creates following users using API
      | id    |
      | Alice |
    And "Alice" creates the following file into personal space using API
      | pathToFile | content     |
      | example.md | lorem ipsum |

    And "Alice" logs in
    And "Alice" opens the "files" app
    And "Alice" creates a public link of following resource using the sidebar panel
      | resource     | role     | password |
      | example.md   | Can edit | %public% |

    When "Anonymous" opens the public link "Unnamed link"
    And "Anonymous" unlocks the public link with password "%public%"
    And "Anonymous" is in a text-editor
    And "Anonymous" should see the text "lorem ipsum" in the text-editor
    And "Anonymous" enters the text "Anonymous says hello" in editor "TextEditor"
    And "Anonymous" saves the file viewer

    When "Alice" opens file "example.md" via "text-editor" using the context menu
    And "Alice" should see the text "Anonymous says hello" in the text-editor
    And "Alice" enters the text "Alice says hello" in editor "TextEditor"
    And "Anonymous" should see the text "Anonymous says hello" in the text-editor
    And "Alice" saves the file viewer

    When "Anonymous" reloads the page
    Then "Anonymous" should see the text "Alice says hello" in the text-editor

    And "Alice" logs out