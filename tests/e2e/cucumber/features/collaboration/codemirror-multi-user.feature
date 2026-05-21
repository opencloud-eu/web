Feature: Multi-user collaboration in CodeMirror
  As two users editing the same file
  I want to see each other's caret and typed text live
  So that we can collaborate without stepping on each other

  Background:
    Given "Admin" creates following user using API
      | id    |
      | Alice |
      | Brian |


  Scenario: Brian sees Alice's caret and typed content on a shared file
    And "Alice" creates the following files into personal space using API
      | pathToFile     | content                                                          |
      | shared-note.md | # Shared Note\n\nLINE-A\nLINE-B\nLINE-C\nLINE-D\nLINE-E\n        |
    And "Alice" shares the following resource using API
      | resource       | recipient | type | role     |
      | shared-note.md | Brian     | user | Can edit |
    When "Alice" logs in
    And "Alice" opens file "shared-note.md" via "code-mirror" using the context menu
    Then "Alice" should see the realtime collab status "connected"
    And "Brian" logs in
    And "Brian" navigates to the shared with me page
    And "Brian" opens file "shared-note.md" via "code-mirror" using the context menu
    Then "Brian" should see the realtime collab status "connected"
    And "Brian" should see content "LINE-C" in the "codemirror" editor
    When "Alice" places the caret on line 4 in the codemirror editor
    Then "Brian" should see a remote caret on line 4 labelled "Alice"
    When "Alice" types "ALICE-WROTE" at the end of the "codemirror" editor
    Then "Brian" should see content "ALICE-WROTE" in the "codemirror" editor
    And "Alice" logs out
    And "Brian" logs out
