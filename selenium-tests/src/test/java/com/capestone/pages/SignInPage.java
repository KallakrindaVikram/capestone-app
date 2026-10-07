package com.capestone.pages;

import com.capestone.testsupport.TestConfig;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

public class SignInPage {
  private final WebDriver driver;
  private final WebDriverWait wait;

  private final By emailInput = By.id("emailAddress");
  private final By passwordInput = By.id("password");
  private final By signInButton = By.cssSelector("form button[type='submit']");
  private final By signOutLink = By.cssSelector("header a[href='/signout']");

  public SignInPage(WebDriver driver, WebDriverWait wait) {
    this.driver = driver;
    this.wait = wait;
  }

  public SignInPage open() {
    driver.get(TestConfig.UI_BASE_URL + "/signin");
    return waitForLoad();
  }

  /** For when the app has redirected here (e.g. an unauthenticated favorite). */
  public SignInPage waitForLoad() {
    wait.until(ExpectedConditions.visibilityOfElementLocated(signInButton));
    return this;
  }

  /** Signs in and waits until the header shows the signed-in navigation. */
  public void signIn(String email, String password) {
    WebElement email_ = wait.until(ExpectedConditions.visibilityOfElementLocated(emailInput));
    email_.clear();
    email_.sendKeys(email);

    WebElement password_ = driver.findElement(passwordInput);
    password_.clear();
    password_.sendKeys(password);

    driver.findElement(signInButton).click();
    wait.until(ExpectedConditions.visibilityOfElementLocated(signOutLink));
  }
}
