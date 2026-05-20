Feature: Open a Markdown file in CodeMirror
  As a user with the collaborative editor available
  I want to open .md files in CodeMirror
  So that I can edit them as raw markdown with realtime collaboration

  Background:
    Given "Admin" creates following user using API
      | id    |
      | Alice |


  Scenario: open .md in CodeMirror, see content, realtime connects
    And "Alice" creates the following files into personal space using API
      | pathToFile  | content                  |
      | alpha.md    | # Alpha\n\nALPHA-CONTENT |
    When "Alice" logs in
    And "Alice" opens file "alpha.md" via "code-mirror" using the context menu
    Then "Alice" should see the realtime collab status "connected"
    And "Alice" should see content "ALPHA-CONTENT" in the "codemirror" editor
    And "Alice" logs out


  Scenario: navigate between two .md files rebuilds the collab session without leaks
    And "Alice" creates the following files into personal space using API
      | pathToFile  | content                  |
      | alpha.md    | # Alpha\n\nALPHA-CONTENT |
      | beta.md     | # Beta\n\nBETA-CONTENT   |
    When "Alice" logs in
    And "Alice" opens file "alpha.md" via "code-mirror" using the context menu
    Then "Alice" should see the realtime collab status "connected"
    And "Alice" should see content "ALPHA-CONTENT" in the "codemirror" editor
    When "Alice" closes the file viewer
    And "Alice" opens file "beta.md" via "code-mirror" using the context menu
    Then "Alice" should see the realtime collab status "connected"
    And "Alice" should see content "BETA-CONTENT" in the "codemirror" editor
    And "Alice" should not see content "ALPHA-CONTENT" in the "codemirror" editor
    And "Alice" logs out
