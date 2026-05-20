Feature: Save-back from CodeMirror to native file
  As a user with the collaborative CodeMirror editor
  I want my edits to persist to the OC backend on save
  So that the file on disk reflects what I typed

  Background:
    Given "Admin" creates following user using API
      | id    |
      | Alice |


  Scenario: typing then Ctrl+S persists the marker to OC over WebDAV
    And "Alice" creates the following files into personal space using API
      | pathToFile     | content                  |
      | save-back.md   | initial content          |
    When "Alice" logs in
    And "Alice" opens file "save-back.md" via "code-mirror" using the context menu
    Then "Alice" should see the realtime collab status "connected"
    And "Alice" should see content "initial content" in the "codemirror" editor
    When "Alice" types "MARKER-CUC" at the end of the "codemirror" editor
    And "Alice" saves the current file with Ctrl+S
    Then the file "save-back.md" in "Alice"'s personal space should contain "MARKER-CUC"
    And the file "save-back.md" in "Alice"'s personal space should contain "initial content"
    And "Alice" logs out
