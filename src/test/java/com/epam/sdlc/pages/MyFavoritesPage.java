package com.epam.sdlc.pages;

import com.epam.sdlc.config.TestConfig;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;

public class MyFavoritesPage extends BasePage {
  private final By heading = By.xpath("//h2[normalize-space()='My Favorites']");
  private final By favoriteItems = By.cssSelector("ul.favorites--list a.course--link");
  private final By ownerLine = By.cssSelector("ul.favorites--list a.course--link p.course--author");

  public MyFavoritesPage(WebDriver driver) {
    super(driver);
  }

  public MyFavoritesPage open() {
    driver.get(TestConfig.UI_BASE_URL + "/favorites");
    visible(heading);
    return this;
  }

  public boolean hasAtLeastOneFavorite() {
    return driver.findElements(favoriteItems).size() > 0;
  }

  public boolean hasOwnerDetailsVisible() {
    return isPresent(ownerLine);
  }
}
