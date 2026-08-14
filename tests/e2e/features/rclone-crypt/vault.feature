Feature: Work with an rclone-crypt encrypted vault
  As a user with rclone-crypt-encrypted folders on the server
  I want to browse, edit and upload through OpenCloud Web under cleartext names
  So that I can work with my encrypted files without decrypting them manually
  We check that when uploading files or editing them, the payload sent to the server is encrypted

  Background:
    Given "Admin" creates following user using API
      | id    |
      | Alice |

  @rclone-crypt
  Scenario: create and upload a file into a vault encrypts it on the server
    When "Alice" logs in
    And "Alice" creates the following resources
      | resource                | type    | content             | password |
      | my.vault                | vault   |                     | foobar   |
      | my.vault/sub            | folder  |                     | foobar   |
      | my.vault/sub/nested.txt | txtFile | nested file content | foobar   |
      | my.vault/hello.txt      | txtFile | hello world         | foobar   |
    And "Alice" uploads the following resource
      | resource          | to           | password |
      | PARENT/parent.txt | my.vault/sub | foobar   |
      | testavatar.png    | my.vault/sub | foobar   |
    And "Alice" enters the vault "my.vault" with passphrase "foobar"
    Then following resources should be displayed in the files list for user "Alice"
      | resource  |
      | hello.txt |
      | sub       |
    When "Alice" opens folder "sub"
    And following resources should be displayed in the files list for user "Alice"
      | resource   |
      | nested.txt |
      | parent.txt |
    And "Alice" opens the following file in texteditor
      | resource   |
      | nested.txt |
    Then "Alice" should see the content "nested file content" in editor "TextEditor"
    And "Alice" closes the file viewer
    When "Alice" opens the following file in texteditor
      | resource   |
      | parent.txt |
    Then "Alice" should see the content "OpenCloud test text file parent" in editor "TextEditor"
    And "Alice" closes the file viewer
    When "Alice" opens the following file in mediaviewer
      | resource       |
      | testavatar.png |
    Then "Alice" is in a media-viewer
    And "Alice" closes the file viewer
    And "Alice" logs out

  
  @rclone-crypt
  Scenario: Drag-drop a directory tree into a vault
    When "Alice" logs in
    And "Alice" creates the following resource
      | resource | type    | password       |
      | my.vault | vault   | myStrongPass#1 |
    And "Alice" enters the vault "my.vault" with passphrase "myStrongPass#1"
    And "Alice" uploads the following resources via drag-n-drop
      | resource   | password       |
      | simple.pdf | myStrongPass#1 |
      | PARENT     | myStrongPass#1 |
    And "Alice" opens the "files" app
    And "Alice" enters the vault "my.vault" with passphrase "myStrongPass#1"
    And following resources should be displayed in the files list for user "Alice"
      | resource   |
      | simple.pdf |
      | PARENT     |
    And "Alice" logs out

  @rclone-crypt
  Scenario: A wrong passphrase is rejected
    When "Alice" logs in
    And "Alice" creates the following resource
      | resource | type    | password |
      | my.vault | vault   | 123      |
    And "Alice" navigates to the personal space page
    And "Alice" fails to enter the vault "my.vault" with the wrong passphrase "definitely-wrong"
    And "Alice" logs out

  @rclone-crypt
  Scenario: A vault root is collaborator-shareable but not public-linkable, its content stays private
   Given "Admin" creates following user using API
      | id    |
      | Brian |
   When "Alice" logs in
   And "Alice" creates the following resources
      | resource              | type    | content     | password |
      | share.vault           | vault   |             | foobar   |
      | share.vault/hello.txt | txtFile | hello world | foobar   |
    And "Alice" shares the following resource using the sidebar panel
      | resource    | recipient | type | role     | resourceType |
      | share.vault | Brian     | user | Can edit | folder       |
    And "Alice" logs out
    When "Brian" logs in
    And "Brian" navigates to the shared with me page
    And "Brian" enters the vault "share.vault" with passphrase "foobar"
    And following resource should be displayed in the files list for user "Brian"
      | resource  |
      | hello.txt |
    And "Brian" opens the following file in texteditor
      | resource  |
      | hello.txt |
    And "Brian" should see the content "hello world" in editor "TextEditor"
    And "Brian" logs out

  @rclone-crypt
  Scenario: Rename and download a vault file
    When "Alice" logs in
   And "Alice" creates the following resources
      | resource           | type    | content     | password |
      | my.vault           | vault   |             | foobar   |
      | my.vault/hello.txt | txtFile | hello world | foobar   |
    And "Alice" navigates to the personal space page
    When "Alice" renames the following resource
      | resource | as            |
      | my.vault | renamed.vault |
    And "Alice" enters the vault "renamed.vault" with passphrase "foobar"
    Then following resource should be displayed in the files list for user "Alice"
      | resource  |
      | hello.txt |
    And "Alice" downloads the following resource using the sidebar panel
      | resource  | type |
      | hello.txt | file |
    And "Alice" logs out

  @rclone-crypt
  Scenario: Create normal folder with .vault suffix which will be treated as a vault
    When "Alice" logs in
    And "Alice" creates the following resources
      | resource | type   |
      | my.vault | folder |
    And "Alice" opens folder "my.vault"
    And "Alice" sets the vault password "foobar"
    And "Alice" navigates to the personal space page
    And "Alice" locks the vault "my.vault"
    And "Alice" enters the vault "my.vault" with passphrase "foobar"
    And "Alice" creates the following resources
      | resource | type   |
      | lorem    | folder |
    And "Alice" logs out

  @rclone-crypt
  Scenario: Vault with content but no integrity token
    When "Alice" logs in
    And "Alice" creates the following resources
      | resource       | type   | password |
      | vaultOne.vault | vault  | foobar   |
      | vaultTwo       | folder |          |
    And "Alice" enters the vault "vaultOne.vault" with passphrase "foobar"
    And "Alice" creates the following resources
      | resource  | type    | content       |
      | lorem.txt | txtFile | hello content |
    And "Alice" opens the "files" app
    And "Alice" renames the following resource
      | resource       | as       |
      | vaultOne.vault | vaultOne |
    And "Alice" copies all resource from folder "vaultOne" to folder "Personal/vaultTwo"
    And "Alice" navigates to the personal space page
    And "Alice" opens folder "vaultTwo"
    Then following resource should not be displayed in the files list for user "Alice"
      | resource  |
      | lorem.txt |
    When "Alice" navigates to the personal space page
    And "Alice" renames the following resource
      | resource | as             |
      | vaultTwo | vaultTwo.vault |
    And "Alice" enters the vault "vaultTwo.vault" with passphrase "foobar"
    And "Alice" opens the following file in texteditor
      | resource  |
      | lorem.txt |
    Then "Alice" should see the content "hello content" in editor "TextEditor"
    And "Alice" closes the file viewer
    And "Alice" logs out

  @rclone-crypt
  Scenario: Create a vault inside a project space
    Given "Admin" creates following user using API
      | id    |
      | Brian |
    And "Admin" assigns following role to the users using API
      | id    | role        |
      | Alice | Space Admin |
    And "Alice" creates the following project spaces using API
      | name     |
      | ourspace |
    When "Alice" logs in
    And "Alice" navigates to the project space "ourspace"
    And "Alice" creates the following resources
      | resource                | type    | content             | password |
      | my.vault                | vault   |                     | foobar   |
      | my.vault/sub            | folder  |                     | foobar   |
      | my.vault/hello.txt      | txtFile | hello world         | foobar   |
    And "Alice" uploads the following resource
      | resource          | to           | password |
      | PARENT/parent.txt | my.vault/sub | foobar   |
      | testavatar.png    | my.vault/sub | foobar   |
    And "Alice" enters the vault "my.vault" with passphrase "foobar"
    Then following resources should be displayed in the files list for user "Alice"
      | resource  |
      | hello.txt |
      | sub       |
    When "Alice" opens the following file in texteditor
      | resource  |
      | hello.txt |
    Then "Alice" should see the content "hello world" in editor "TextEditor"
    And "Alice" closes the file viewer
    When "Alice" opens folder "sub"
    Then following resources should be displayed in the files list for user "Alice"
      | resource       |
      | testavatar.png |
      | parent.txt     |
    When "Alice" opens the following file in texteditor
      | resource   |
      | parent.txt |
    Then "Alice" should see the content "OpenCloud test text file parent" in editor "TextEditor"
    And "Alice" closes the file viewer
    When "Alice" opens the following file in mediaviewer
      | resource       |
      | testavatar.png |
    Then "Alice" is in a media-viewer
    And "Alice" closes the file viewer
    When "Alice" navigates to the project space "ourspace"
    And "Alice" adds following user to the project space
      | user     | role     | kind  |
      | Brian    | Can edit | user  |
    Then "Alice" logs out

    # check vault by space member
    When "Brian" logs in
    And "Brian" navigates to the project space "ourspace"
    And "Brian" enters the vault "my.vault" with passphrase "foobar"
    And "Brian" opens the following file in texteditor
      | resource  |
      | hello.txt |
    Then "Brian" should see the content "hello world" in editor "TextEditor"
    And "Brian" closes the file viewer
    When "Brian" opens folder "sub"
    And "Brian" opens the following file in texteditor
      | resource   |
      | parent.txt |
    Then "Brian" should see the content "OpenCloud test text file parent" in editor "TextEditor"
    And "Brian" closes the file viewer
    When "Brian" opens the following file in mediaviewer
      | resource       |
      | testavatar.png |
    Then "Brian" is in a media-viewer
    And "Brian" closes the file viewer
    And "Brian" logs out

