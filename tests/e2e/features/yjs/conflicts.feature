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

  Scenario: editor with unsaved changes is told about an external file update right away
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
    When "Alice" creates the following file into personal space using API
      | pathToFile      | content                                                                                                |
      | textfile.ocnote | {"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"external update"}]}]} |
    Then "Alice" should see an error message
      """
      This file was updated outside this window. Please copy your changes, save the file under a new name (»Save As...«) or reload the page to discard your changes.
      """
    And "Alice" should see the following yjs status
      | status       |
      | Disconnected |
    And "Alice" should see the text "Alice says hello" in the text-editor

    And "Alice" saves the file viewer expecting conflict error
    And "Alice" sees the current file as dirty
    And "Alice" reloads the page
    Then "Alice" should see the text "external update" in the text-editor
    And "Alice" should see the following yjs status
      | status    |
      | Connected |
    And "Alice" logs out

  # The same bytes under a new etag are not a content change. The editor
  # records the etag and carries on, so the save goes through.
  Scenario: re-upload of the same content does not interrupt the editor
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

    # external re-upload of the identical file
    When "Alice" uploads the following local file into personal space using API
      | localFile        | to               |
      | textfile.ocnote  | textfile.ocnote  |
    And "Alice" enters the text "Alice keeps typing" in editor "TextEditor"
    Then "Alice" should see the following yjs status
      | status    |
      | Connected |
    And "Alice" saves the file viewer
    And "Alice" reloads the page
    Then "Alice" should see the text "Alice keeps typing" in the text-editor
    And "Alice" logs out

  Scenario: editor without unsaved changes shows an external file update right away
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
    Then "Alice" should see the text "some random text" in the text-editor
    And "Alice" should see a notification
      """
      This file was updated outside this window. The editor now shows the latest version.
      """
    And "Alice" should see the following yjs status
      | status    |
      | Connected |

    When "Brian" logs in
    And "Brian" navigates to the project space "team"
    And "Brian" opens file "textfile.ocnote" via "text-editor" using the context menu
    And "Brian" should see the following yjs status
      | status    |
      | Connected |
    Then "Brian" should see the text "some random text" in the text-editor
    And "Alice" logs out
    And "Brian" logs out

  Scenario: viewer joining after an external file update sees the current version
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
    Then "Alice" should see the text "some random text" in the text-editor

    When "Brian" logs in
    And "Brian" navigates to the project space "team"
    And "Brian" opens file "textfile.ocnote" via "text-editor" using the context menu
    Then "Brian" should see the text "some random text" in the text-editor
    And "Alice" logs out
    And "Brian" logs out

  Scenario: external file update doesn't overwrite unsaved local changes
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
    Then "Alice" should see an error message
      """
      This file was updated outside this window. Please copy your changes, save the file under a new name (»Save As...«) or reload the page to discard your changes.
      """
    And "Alice" should see the following yjs status
      | status       |
      | Disconnected |
    And "Alice" should see the text "Alice update #2" in the text-editor

    # a joiner holding the fresh file recovers the flagged room
    When "Brian" logs in
    And "Brian" navigates to the project space "team"
    And "Brian" opens file "textfile.ocnote" via "text-editor" using the context menu
    Then "Brian" should see the text "some random text" in the text-editor
    And "Brian" should see the following yjs status
      | status    |
      | Connected |
    And "Alice" should see the text "Alice update #2" in the text-editor
    And "Alice" logs out
    And "Brian" logs out

  # A share recipient of a personal-space file receives no server-sent events
  # for it, so the update only reaches the room once a peer with the fresh
  # file joins.
  Scenario: share recipient sees an external file update when the owner joins
    When "Alice" uploads the following local file into personal space using API
      | localFile        | to               |
      | textfile.ocnote  | textfile.ocnote  |
    And "Alice" shares the following resources using API
      | resource        | recipient | type | role     |
      | textfile.ocnote | Brian     | user | Can edit |

    And "Brian" logs in
    And "Brian" navigates to the shared with me page
    And "Brian" opens file "textfile.ocnote" via "text-editor" using the context menu
    And "Brian" should see the following yjs status
      | status    |
      | Connected |
    And "Brian" enters the text "Brian says hello" in editor "TextEditor"
    And "Brian" sees the current file as dirty
    And "Brian" saves the file viewer

    # external update
    When "Alice" uploads the following local file into personal space using API
      | localFile        | to               |
      | textfile.ocnote  | textfile.ocnote  |
    Then "Brian" should see the text "Brian says hello" in the text-editor

    When "Alice" logs in
    And "Alice" opens the "files" app
    And "Alice" opens file "textfile.ocnote" via "text-editor" using the context menu
    And "Alice" should see the following yjs status
      | status    |
      | Connected |
    Then "Alice" should see the text "some random text" in the text-editor
    And "Brian" should see the text "some random text" in the text-editor
    And "Alice" logs out
    And "Brian" logs out
