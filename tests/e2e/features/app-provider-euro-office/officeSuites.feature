Feature: Integrate with online office suites using Euro-Office online office
  As a user
  I want to work on different docs, sheets, slides etc.., using Euro-Office online office
  So that the collaboration is seamless

  Background:
    Given "Admin" creates following users using API
      | id    |
      | Alice |
      | Brian |
    And "Alice" logs in
    And "Alice" opens the "files" app


  Scenario: create a Microsoft Word file with Euro-Office
    When "Alice" creates the following resource
      | resource           | type           | content                |
      | MicrosoftWord.docx | Microsoft Word | Microsoft Word Content |
    And "Alice" creates a public link of following resource using the sidebar panel
      | resource           | role     | password |
      | MicrosoftWord.docx | Can edit | %public% |
    And "Alice" opens the following file in Euro-Office
      | resource           |
      | MicrosoftWord.docx |
    And "Anonymous" opens the public link "Unnamed link"
    And "Anonymous" unlocks the public link with password "%public%"
    Then "Anonymous" should see the content "Microsoft Word Content" in editor "Euro-Office"
    When "Alice" edits the following resource
      | resource           | type           | content                             |
      | MicrosoftWord.docx | Microsoft Word | Alice Edited Microsoft Word Content |
    Then "Anonymous" should see the content "Alice Edited Microsoft Word Content" in editor "Euro-Office"
    When "Anonymous" edits the following resource
      | resource           | type           | content                       |
      | MicrosoftWord.docx | Microsoft Word | Edited Microsoft Word Content |
    Then "Alice" should see the content "Edited Microsoft Word Content" in editor "Euro-Office"
    And "Alice" closes the file viewer
    When "Alice" edits the public link named "Unnamed link" of resource "MicrosoftWord.docx" changing role to "Can view"
    And "Anonymous" opens the public link "Unnamed link"
    And "Anonymous" unlocks the public link with password "%public%"
    Then "Anonymous" should not be able to edit content of following resource
      | resource           | type           | content                       |
      | MicrosoftWord.docx | Microsoft Word | Edited Microsoft Word Content |

    And for "Alice" file "MicrosoftWord.docx" should not be locked
    When "Alice" shares the following resource using the sidebar panel
      | resource           | recipient | type | role     | resourceType |
      | MicrosoftWord.docx | Brian     | user | Can view | file         |
    And "Brian" logs in
    And "Brian" navigates to the shared with me page
    And "Brian" opens the following file in Euro-Office
      | resource           |
      | MicrosoftWord.docx |
    Then "Brian" should not be able to edit content of following resource
      | resource           | type           | content                       |
      | MicrosoftWord.docx | Microsoft Word | Edited Microsoft Word Content |
    And "Brian" closes the file viewer
    When "Alice" updates following sharee role
      | resource           | recipient | type | role     | resourceType |
      | MicrosoftWord.docx | Brian     | user | Can edit | file         |
    And "Alice" opens the following file in Euro-Office
      | resource           |
      | MicrosoftWord.docx |
    And "Brian" opens the following file in Euro-Office
      | resource           |
      | MicrosoftWord.docx |
    And "Alice" edits the following resource
      | resource           | type           | content                             |
      | MicrosoftWord.docx | Microsoft Word | Alice Edited Microsoft Word Content |
    Then "Brian" should see the content "Alice Edited Microsoft Word Content" in editor "Euro-Office"
    When "Brian" edits the following resource
      | resource           | type           | content                             |
      | MicrosoftWord.docx | Microsoft Word | Brian Edited Microsoft Word Content |
    Then "Alice" should see the content "Brian Edited Microsoft Word Content" in editor "Euro-Office"
    And "Alice" logs out
    And "Brian" logs out


  Scenario: public creates a Microsoft Word file with Euro-Office
    Given "Admin" assigns following role to the users using API
      | id    | role        |
      | Alice | Space Admin |
    And "Alice" creates the following project space using API
      | name      | id          |
      | Marketing | marketing.1 |
    And "Alice" creates the following folder in space "Marketing" using API
      | name     |
      | myfolder |
    When "Alice" navigates to the project space "marketing.1"
    And "Alice" creates a public link for the space with password "%public%" using the sidebar panel
    And "Alice" renames the most recently created public link of space to "spaceLink"
    And "Alice" edits the public link named "spaceLink" of the space changing role to "Can edit"
    And "Alice" creates a public link of following resource using the sidebar panel
      | resource | role     | password |
      | myfolder | Can edit | %public% |

    # public create .docx file using spaceLink
    When "Anonymous" opens the public link "spaceLink"
    And "Anonymous" unlocks the public link with password "%public%"
    And "Anonymous" creates the following resource
      | resource            | type           | content                                                      |
      | usingSpaceLink.docx | Microsoft Word | public can create files in the project space using spaceLink |

    # public create .docx file using folderLink
    When "Anonymous" opens the public link "Unnamed link"
    And "Anonymous" unlocks the public link with password "%public%"
    And "Anonymous" creates the following resource
      | resource             | type           | content                |
      | usingFolderLink.docx | Microsoft Word | Microsoft Word Content |

    When "Alice" navigates to the project space "marketing.1"
    And "Alice" opens the following file in Euro-Office
      | resource            |
      | usingSpaceLink.docx |
    Then "Alice" should see the content "public can create files in the project space using spaceLink" in editor "Euro-Office"
    And "Alice" closes the file viewer

    When "Alice" opens folder "myfolder"
    And "Alice" opens the following file in Euro-Office
      | resource             |
      | usingFolderLink.docx |
    Then "Alice" should see the content "Microsoft Word Content" in editor "Euro-Office"
    And "Alice" logs out


  Scenario: create files from office templates
    Given "Alice" uploads the following local file into personal space using API
      | localFile     | to            |
      | Template.dotx | Template.dotx |

    When "Alice" creates a file from template file "Template.dotx" via "Euro-Office" using the sidebar panel
    Then "Alice" should see the content "As a user I want to create a document by clicking on a template file" in editor "Euro-Office"
    And "Alice" closes the file viewer

    And following resource should be displayed in the files list for user "Alice"
      | resource      |
      | Template.docx |

    When "Alice" opens file "Template.dotx"
    Then "Alice" should see the content "As a user I want to create a document by clicking on a template file" in editor "Euro-Office"

    When "Alice" closes the file viewer
    And following resource should be displayed in the files list for user "Alice"
      | resource          |
      | Template (1).docx |

    And "Alice" logs out
