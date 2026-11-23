Feature: Favorites
  As a user
  I want to mark resources as favorites and find them in the favorites section

  Background:
    Given "Admin" creates following users using API
      | id    |
      | Alice |
      | Brian |

  Scenario: mark resources as favorites
    Given "Admin" assigns following role to the users using API
      | id    | role        |
      | Alice | Space Admin |
    And "Alice" creates the project space using API "service-team"
    And "Alice" adds the following member to the space "service-team" using API
      | user  | role     | shareType |
      | Brian | Can view | user      |
    And "Alice" creates the following folder in personal space using API
      | name   |
      | shared |
    And "Alice" uploads the following local file into personal space using API
      | localFile      | to                    |
      | testavatar.jpg | shared/testavatar.jpg |
    And "Alice" shares the following resource using API
      | resource | recipient | type  | role     |
      | shared   | Brian     | user  | Can edit |
    And "Brian" uploads the following local file into personal space using API
      | localFile       | to         |
      | user-avatar.png | image.png  |
      | test_video.mp4  | video.mp4  |
      | simple.pdf      | simple.pdf |
      | lorem.txt       | lorem.txt  |


    And "Brian" logs in
    And "Brian" navigates to the shared with me page
    And "Brian" opens folder "shared"
    When "Brian" marks the following resource as favorite using "context menu"
      | resource        |
      | testavatar.jpg  |
    And "Brian" navigates to the personal space page
    And "Brian" marks the following resources as favorite using "batch action"
      | resource   |
      | image.png  |
      | simple.pdf |
      | lorem.txt  |
    And "Brian" opens the following file in mediaviewer
      | resource  |
      | video.mp4 |
    And "Brian" is in a media-viewer
    And "Brian" marks the following resource as favorite using "preview"
      | resource  |
      | video.mp4 |
    And "Brian" closes the file viewer
    And "Brian" navigates to the favorites page
    And following resources should be displayed in the files list for user "Brian"
      | resource       |
      | testavatar.jpg |
      | image.png      |
      | simple.pdf     |
      | lorem.txt      |
      | video.mp4      |
    And "Brian" removes the following resource from favorites using "context menu"
      | resource  |
      | image.png |
    And following resource should not be displayed in the files list for user "Brian"
      | resource       |
      | image.png      |
    And "Brian" removes the following resources from favorites using "batch action"
      | resource   |
      | video.mp4  |
      | simple.pdf |
    And following resources should not be displayed in the files list for user "Brian"
      | resource   |
      | video.mp4  |
      | simple.pdf |

    And "Brian" navigates to the personal space page
    And "Brian" removes the following resource from favorites using "batch action"
      | resource  |
      | lorem.txt |
    And "Brian" navigates to the favorites page
    And following resources should not be displayed in the files list for user "Brian"
      | resource   |
      | image.png  |
      | video.mp4  |
      | simple.pdf |
      | lorem.txt  |
    And "Brian" logs out


  Scenario: mark project spaces as favorites
    Given "Admin" assigns following role to the users using API
      | id    | role        |
      | Alice | Space Admin |
    And "Alice" creates the following project spaces using API
      | name      |
      | team      |
      | sales     |
      | support   |
      | marketing |
    And "Alice" logs in
    And "Alice" navigates to the projects space page
    When "Alice" marks the following resources as favorite using "batch action"
      | resource |
      | sales    |
      | support  |
    And "Alice" marks the following resource as favorite using "context menu"
      | resource |
      | team     |
    Then "Alice" should see the favorite indicator for the following resources
      | resource |
      | team     |
      | sales    |
      | support  |
    And "Alice" should not see the favorite indicator for the following resource
      | resource  |
      | marketing |
    When "Alice" navigates to the project space "marketing"
    And "Alice" marks the following resource as favorite using "space header"
      | resource  |
      | marketing |
    And "Alice" navigates to the favorites page
    Then following resources should be displayed in the files list for user "Alice"
      | resource  |
      | team      |
      | sales     |
      | support   |
      | marketing |
    When "Alice" removes the following resource from favorites using "context menu"
      | resource |
      | team     |
    Then following resource should not be displayed in the files list for user "Alice"
      | resource |
      | team     |
    When "Alice" removes the following resources from favorites using "batch action"
      | resource |
      | sales    |
      | support  |
    Then following resources should not be displayed in the files list for user "Alice"
      | resource |
      | sales    |
      | support  |
    When "Alice" navigates to the project space "marketing"
    And "Alice" removes the following resource from favorites using "space header"
      | resource  |
      | marketing |
    And "Alice" navigates to the projects space page
    Then "Alice" should not see the favorite indicator for the following resources
      | resource  |
      | team      |
      | sales     |
      | support   |
      | marketing |
    When "Alice" navigates to the favorites page
    Then following resource should not be displayed in the files list for user "Alice"
      | resource  |
      | marketing |
    And "Alice" logs out


  Scenario: mark shares as favorites
    Given "Admin" assigns following role to the users using API
      | id    | role        |
      | Alice | Space Admin |
    And "Alice" creates the following project spaces using API
      | name    |
      | team    |
      | archive |
    And "Alice" adds the following member to the space "team" using API
      | user  | role     | shareType |
      | Brian | Can view | user      |
    And "Alice" adds the following member to the space "archive" using API
      | user  | role     | shareType |
      | Brian | Can view | user      |
    And "Alice" creates the following folders in personal space using API
      | name          |
      | sharedFolder  |
      | linkFolder    |
      | anotherFolder |
    And "Alice" shares the following resource using API
      | resource     | recipient | type | role     |
      | sharedFolder | Brian     | user | Can edit |
    And "Alice" creates a public link of following resource using API
      | resource      | name    | password |
      | linkFolder    | linkOne | %public% |
      | anotherFolder | linkTwo | %public% |
    And "Brian" logs in

    # spaces shared with Brian
    And "Brian" navigates to the projects space page
    When "Brian" marks the following resources as favorite using "batch action"
      | resource |
      | team     |
      | archive  |
    Then "Brian" should see the favorite indicator for the following resources
      | resource |
      | team     |
      | archive  |

    # resource shared with Brian
    When "Brian" navigates to the shared with me page
    And "Brian" marks the following resource as favorite using "context menu"
      | resource     |
      | sharedFolder |
    Then "Brian" should see the favorite indicator for the following resource
      | resource     |
      | sharedFolder |
    When "Brian" navigates to the favorites page
    Then following resources should be displayed in the files list for user "Brian"
      | resource     |
      | team         |
      | archive      |
      | sharedFolder |
    When "Brian" navigates to the shared with me page
    And "Brian" removes the following resource from favorites using "context menu"
      | resource     |
      | sharedFolder |
    Then "Brian" should not see the favorite indicator for the following resource
      | resource     |
      | sharedFolder |

    When "Alice" logs in
    And "Alice" navigates to the shared with others page
    And "Alice" marks the following resource as favorite using "context menu"
      | resource     |
      | sharedFolder |
    Then "Alice" should see the favorite indicator for the following resource
      | resource     |
      | sharedFolder |
    When "Alice" navigates to the shared via link page
    And "Alice" marks the following resources as favorite using "batch action"
      | resource      |
      | linkFolder    |
      | anotherFolder |
    Then "Alice" should see the favorite indicator for the following resources
      | resource      |
      | linkFolder    |
      | anotherFolder |
    When "Alice" navigates to the favorites page
    Then following resources should be displayed in the files list for user "Alice"
      | resource      |
      | sharedFolder  |
      | linkFolder    |
      | anotherFolder |

    # a disabled space disappears from the favorites of its members
    When "Alice" opens the "admin-settings" app
    And "Alice" navigates to the project spaces management page
    And "Alice" disables the space "archive" using the context-menu
    And "Alice" logs out
    
    And "Brian" navigates to the favorites page
    Then following resource should be displayed in the files list for user "Brian"
      | resource |
      | team     |
    And following resource should not be displayed in the files list for user "Brian"
      | resource |
      | archive  |
    And "Brian" logs out
