Feature: Work with an rclone-crypt encrypted vault space
  As a user with an end-to-end encrypted project space
  I want to unlock it and work with its files under cleartext names
  So that I can collaborate on encrypted content without decrypting it manually
  We check that when uploading files or editing them, the payload sent to the server is encrypted

  Background:
    Given "Admin" creates following users using API
      | id    |
      | Alice |
      | Brian |
    And "Admin" assigns following role to the users using API
      | id    | role        |
      | Alice | Space Admin |

  @rclone-crypt
  Scenario: Create a vault space, work with its files and share it with a space member
    When "Alice" logs in
    And "Alice" navigates to the projects space page
    And "Alice" creates the following project spaces
      | name       | password |
      | vaultspace | foobar   |
    And "Alice" enters the vault space "vaultspace" with passphrase "foobar"
    And "Alice" creates the following resources
      | resource  | type    | content     | password |
      | hello.txt | txtFile | hello world | foobar   |
    And "Alice" uploads the following resource
      | resource       | password |
      | testavatar.png | foobar   |
    Then following resources should be displayed in the files list for user "Alice"
      | resource       |
      | hello.txt      |
      | testavatar.png |
    When "Alice" opens the following file in texteditor
      | resource  |
      | hello.txt |
    Then "Alice" should see the content "hello world" in editor "TextEditor"
    And "Alice" closes the file viewer
    When "Alice" opens the following file in mediaviewer
      | resource       |
      | testavatar.png |
    Then "Alice" is in a media-viewer
    And "Alice" closes the file viewer
    When "Alice" navigates to the project space "vaultspace"
    And "Alice" adds following user to the project space
      | user  | role     | kind |
      | Brian | Can edit | user |
    And "Alice" logs out

    When "Brian" logs in
    And "Brian" enters the vault space "vaultspace" with passphrase "foobar"
    Then following resources should be displayed in the files list for user "Brian"
      | resource       |
      | hello.txt      |
      | testavatar.png |
    When "Brian" opens the following file in texteditor
      | resource  |
      | hello.txt |
    Then "Brian" should see the content "hello world" in editor "TextEditor"
    And "Brian" closes the file viewer
    When "Brian" opens the following file in mediaviewer
      | resource       |
      | testavatar.png |
    Then "Brian" is in a media-viewer
    And "Brian" closes the file viewer
    And "Brian" logs out

  @rclone-crypt
  Scenario: Reloading an unlocked vault space locks it again
    When "Alice" logs in
    And "Alice" navigates to the projects space page
    And "Alice" creates the following project spaces
      | name       | password |
      | vaultspace | foobar   |
    And "Alice" enters the vault space "vaultspace" with passphrase "foobar"
    And "Alice" creates the following resources
      | resource  | type    | content     | password |
      | hello.txt | txtFile | hello world | foobar   |
    And "Alice" reloads the page
    Then "Alice" should see the unlock page of the vault space "vaultspace"
    When "Alice" unlocks the vault space with passphrase "foobar"
    Then following resource should be displayed in the files list for user "Alice"
      | resource  |
      | hello.txt |
    And "Alice" logs out
