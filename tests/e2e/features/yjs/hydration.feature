Feature: yjs hydration
  As a user
  I want the file content to appear only once when a session starts
  So that joining a session never duplicates the document body

  Scenario: two writers hydrate the same file at the same time
    Given "Admin" creates following users using API
      | id    |
      | Alice |
      | Brian |
    And "Alice" creates the following file into personal space using API
      | pathToFile | content     |
      | example.md | lorem ipsum |
    And "Alice" shares the following resources using API
      | resource   | recipient | type | role     |
      | example.md | Brian     | user | Can edit |

    And "Alice" logs in
    And "Alice" opens the "files" app
    And "Brian" logs in
    And "Brian" navigates to the shared with me page

    When the following users open file "example.md" via "text-editor" using the context menu at the same time
      | id    |
      | Alice |
      | Brian |
    Then "Alice" should see the following yjs status
      | status    |
      | Connected |
    And "Brian" should see the following yjs status
      | status    |
      | Connected |
    And "Alice" should see the text "lorem ipsum" exactly once in the text-editor
    And "Brian" should see the text "lorem ipsum" exactly once in the text-editor

    And "Alice" logs out
    And "Brian" logs out

  Scenario: a writer and a reader hydrate the same file at the same time
    Given "Admin" creates following users using API
      | id    |
      | Alice |
      | Brian |
    And "Alice" creates the following file into personal space using API
      | pathToFile | content     |
      | example.md | lorem ipsum |
    And "Alice" shares the following resources using API
      | resource   | recipient | type | role     |
      | example.md | Brian     | user | Can view |

    And "Alice" logs in
    And "Alice" opens the "files" app
    And "Brian" logs in
    And "Brian" navigates to the shared with me page

    When the following users open file "example.md" via "text-editor" using the context menu at the same time
      | id    |
      | Alice |
      | Brian |
    Then "Alice" should see the following yjs status
      | status    |
      | Connected |
    And "Brian" should not see a yjs status
    And "Alice" should see the text "lorem ipsum" exactly once in the text-editor
    And "Brian" should see the text "lorem ipsum" exactly once in the text-editor

    And "Alice" logs out
    And "Brian" logs out
