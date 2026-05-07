Feature: Work with an rclone-crypt encrypted vault
  As a user with rclone-crypt-encrypted folders on the server
  I want to browse, edit and upload through OpenCloud Web under cleartext names
  So that I can work with my encrypted files without decrypting them manually
  We check that when uploading files or editing them, the payload sent to the server is encrypted

  Background:
    Given "Admin" creates following users using API
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
    And "Alice" uploads the following resources
      | resource          | to           | password |
      | PARENT/parent.txt | my.vault/sub | foobar   |
    And "Alice" enters the vault "my.vault" with passphrase "foobar"
    And following resources should be displayed in the files list for user "Alice"
      | resource  |
      | hello.txt |
      | sub       |
    And "Alice" opens folder "sub"
    And following resources should be displayed in the files list for user "Alice"
      | resource   |
      | nested.txt |
      | parent.txt |
    And "Alice" opens the following file in texteditor
      | resource   |
      | nested.txt |
    And "Alice" should see the content "nested file content" in editor "TextEditor"
    And "Alice" closes the file viewer
    And "Alice" opens the following file in texteditor
      | resource   |
      | parent.txt |
    And "Alice" should see the content "OpenCloud test text file parent" in editor "TextEditor"
    And "Alice" closes the file viewer
    And "Alice" logs out


  
  @rclone-crypt
  Scenario: Drag-drop a directory tree into a vault
    When "Alice" logs in
    And "Alice" creates the following resources
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
    And "Alice" creates the following resources
      | resource | type    | password |
      | my.vault | vault   | 123      |
    And "Alice" navigates to the personal space page
    And "Alice" fails to enter the vault "my.vault" with the wrong passphrase "definitely-wrong"
    And "Alice" logs out

  @rclone-crypt
  Scenario: A vault root is collaborator-shareable but not public-linkable, its content stays private
   Given "Admin" creates following users using API
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
    And following resources should be displayed in the files list for user "Brian"
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
      | resource | as                 |
      | my.vault | renamed.vault |
    And "Alice" enters the vault "renamed.vault" with passphrase "foobar"
    Then following resources should be displayed in the files list for user "Alice"
      | resource  |
      | hello.txt |
    And "Alice" downloads the following resources using the sidebar panel
      | resource  | type |
      | hello.txt | file |
    And "Alice" logs out
