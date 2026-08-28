Feature: yjs conflict handling
  As a user
  I want the editor to handle external file updates
  So that I can edit a file without losing my changes

  Background:
    Given "Admin" creates following users using API
      | id    |
      | Alice |
      | Brian |
    And "Admin" assigns following roles to the users using API
      | id    | role        |
      | Alice | Space Admin |
    And "Alice" creates the following project spaces using API
      | name | id   |
      | Team | team |

  Scenario: user cannot overwrite an external file update without warning
    When "Alice" uploads the following local file into personal space using API
      | localFile        | to               |
      | textfile.ocnote  | textfile.ocnote  |

    And "Alice" logs in
    And "Alice" opens the "files" app
    And "Alice" opens file "textfile.ocnote" via "text-editor" using the context menu
    And "Alice" should see the following yjs status
      | status    |
      | Connected |
    And "Alice" enters the text "Alice says hello" in editor "TextEditor"

    # external update
    When "Alice" uploads the following local file into personal space using API
      | localFile        | to               |
      | textfile.ocnote  | textfile.ocnote  |
    Then "Alice" should see the text "Alice says hello" in the text-editor

    And "Alice" saves the file viewer expecting conflict error
    And "Alice" sees the current file as dirty
    And "Alice" should see the following yjs status
      | status       |
      | Disconnected |
    And "Alice" reloads the page
    Then "Alice" should see the text "some random text" in the text-editor
    And "Alice" should see the following yjs status
      | status    |
      | Connected |
    And "Alice" logs out

  Scenario: editor sees external file update when peer with edit permissions joins
    When "Alice" uploads the following local file into space "Team" using API
      | localFile        | to               |
      | textfile.ocnote  | textfile.ocnote  |

    When "Alice" logs in
    And "Alice" opens the "files" app
    And "Alice" navigates to the project space "team"
    And "Alice" adds following user to the project space
      | user  | role     | kind |
      | Brian | Can edit | user |
    And "Alice" opens file "textfile.ocnote" via "text-editor" using the context menu
    And "Alice" should see the following yjs status
      | status    |
      | Connected |
    And "Alice" enters the text "Alice says hello" in editor "TextEditor"
    And "Alice" sees the current file as dirty
    And "Alice" saves the file viewer

    # external update
    When "Alice" uploads the following local file into space "Team" using API
      | localFile        | to               |
      | textfile.ocnote  | textfile.ocnote  |
    Then "Alice" should see the text "Alice says hello" in the text-editor

    When "Brian" logs in
    And "Brian" navigates to the project space "team"
    And "Brian" opens file "textfile.ocnote" via "text-editor" using the context menu
    And "Brian" should see the following yjs status
      | status    |
      | Connected |
    Then "Brian" should see the text "some random text" in the text-editor
    And "Alice" should see the text "some random text" in the text-editor
    And "Alice" should see the following yjs status
      | status    |
      | Connected |
    And "Alice" logs out
    And "Brian" logs out

  Scenario: editor sees external file update when peer with view permissions joins
    When "Alice" uploads the following local file into space "Team" using API
      | localFile        | to               |
      | textfile.ocnote  | textfile.ocnote  |

    And "Alice" logs in
    And "Alice" opens the "files" app
    And "Alice" navigates to the project space "team"
    And "Alice" adds following user to the project space
      | user  | role     | kind |
      | Brian | Can view | user |
    And "Alice" opens file "textfile.ocnote" via "text-editor" using the context menu
    And "Alice" should see the following yjs status
      | status    |
      | Connected |
    And "Alice" enters the text "Alice says hello" in editor "TextEditor"
    And "Alice" sees the current file as dirty
    And "Alice" saves the file viewer

    # external update
    When "Alice" uploads the following local file into space "Team" using API
      | localFile        | to               |
      | textfile.ocnote  | textfile.ocnote  |
    Then "Alice" should see the text "Alice says hello" in the text-editor

    When "Brian" logs in
    And "Brian" navigates to the project space "team"
    And "Brian" opens file "textfile.ocnote" via "text-editor" using the context menu
    # FIXME: uncomment when https://github.com/opencloud-eu/web/issues/3103 is resolved
    #Then "Brian" should see the text "some random text" in the text-editor
    Then "Brian" should see the text "Alice says hello" in the text-editor
    #And "Alice" should see the text "some random text" in the text-editor
    And "Alice" should see the text "Alice says hello" in the text-editor
    And "Alice" logs out
    And "Brian" logs out

  Scenario: external file update doesn't overwrite unsaved local changes when peer joins
    When "Alice" uploads the following local file into space "Team" using API
      | localFile        | to               |
      | textfile.ocnote  | textfile.ocnote  |

    And "Alice" logs in
    And "Alice" opens the "files" app
    And "Alice" navigates to the project space "team"
    And "Alice" adds following user to the project space
      | user  | role     | kind |
      | Brian | Can edit | user |
    And "Alice" opens file "textfile.ocnote" via "text-editor" using the context menu
    And "Alice" should see the following yjs status
      | status    |
      | Connected |
    And "Alice" enters the text "Alice says hello" in editor "TextEditor"
    And "Alice" sees the current file as dirty
    And "Alice" saves the file viewer
    And "Alice" enters the text "Alice update #2" in editor "TextEditor"

    # external update
    When "Alice" uploads the following local file into space "Team" using API
      | localFile        | to               |
      | textfile.ocnote  | textfile.ocnote  |
    Then "Alice" should see the text "Alice update #2" in the text-editor

    When "Brian" logs in
    And "Brian" navigates to the project space "team"
    And "Brian" opens file "textfile.ocnote" via "text-editor" using the context menu
    Then "Brian" should see the text "some random text" in the text-editor
    And "Brian" should see the following yjs status
      | status    |
      | Connected |
    And "Alice" should see the text "Alice update #2" in the text-editor
    And "Alice" should see an error message
      """
      This file was updated outside this window. Please copy your changes, save the file under a new name (»Save As...«) or reload the page to discard your changes.
      """
    And "Alice" should see the following yjs status
      | status       |
      | Disconnected |
    And "Alice" logs out
    And "Brian" logs out
  