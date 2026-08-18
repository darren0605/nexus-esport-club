/* =========================================================================
   matches.js
   - Fetches match data from data/matches.json using jQuery $.ajax (acts as
     our RESTful match-data API for the assignment's API requirement).
   - Renders a "Live Match Ticker" from that data.
   - Wires up the filter buttons (All / Live / Upcoming / Completed) and the
     team-name search box against the existing .match-card elements already
     in the page (built by the team's HTML/design — this script does not
     touch that structure).
   ========================================================================= */

$(function () {

  var currentFilter = "all";   // tracks active filter button
  var currentSearch  = "";     // tracks current search text

  var commentKey = "cs2_comments::" + window.location.pathname;
  buildCommentSection(commentKey);

  /* -----------------------------------------------------------------------
     1. CALL THE MATCH-DATA API (jQuery AJAX / GET)
     ----------------------------------------------------------------------- */
  $.ajax({
    url: "data/matches.json",
    method: "GET",
    dataType: "json"
  })
    .done(function (data) {
      renderLiveTicker(data);
    })
    .fail(function (jqXHR, textStatus) {
      console.error("Could not load match data API:", textStatus);
      $("#live-ticker").html(
        '<p class="ticker-error">Live match data is currently unavailable.</p>'
      );
    });

  /* -----------------------------------------------------------------------
     2. LIVE MATCH TICKER — built entirely from the API response
     ----------------------------------------------------------------------- */
  function renderLiveTicker(data) {

    // Create the ticker container once, right above the match list.
    if ($("#live-ticker").length === 0) {
      $('<div id="live-ticker" class="live-ticker"></div>').insertBefore(
        "#match-list-container"
      );
    }

    var liveMatches = [];
    data.events.forEach(function (event) {
      event.matches.forEach(function (match) {
        if (match.status === "LIVE") {
          liveMatches.push({ event: event.name, match: match });
        }
      });
    });

    if (liveMatches.length === 0) {
      $("#live-ticker").html(
        '<p class="ticker-empty">🔴 No matches live right now — check the Upcoming tab.</p>'
      );
      return;
    }

    var html = '<span class="ticker-label">🔴 LIVE NOW:</span> ';
    var parts = liveMatches.map(function (item) {
      return (
        item.match.team1 +
        " " +
        item.match.score +
        " " +
        item.match.team2 +
        " (" +
        item.event +
        ")"
      );
    });
    html += parts.join("&nbsp;&nbsp;|&nbsp;&nbsp;");

    $("#live-ticker").html(html);
  }

  /* -----------------------------------------------------------------------
     3. FILTER BUTTONS (All / Live / Upcoming / Completed)
     ----------------------------------------------------------------------- */
  $("#filter-buttons .btn").on("click", function () {
    $("#filter-buttons .btn").removeClass("active");
    $(this).addClass("active");

    currentFilter = $(this).data("filter"); // "all" | "LIVE" | "UPCOMING" | "FINISHED"
    applyFilters();
  });

  /* -----------------------------------------------------------------------
     4. TEAM NAME SEARCH
     ----------------------------------------------------------------------- */
  $("#search-input").on("keyup", function () {
    currentSearch = $(this).val().trim().toLowerCase();
    applyFilters();
  });

  /* -----------------------------------------------------------------------
     5. APPLY FILTER + SEARCH TOGETHER
     ----------------------------------------------------------------------- */
  function applyFilters() {
    var visibleCount = 0;

    $(".match-card").each(function () {
      var $card = $(this);

      // Determine this card's status from its badge class.
      var statusMatch =
        currentFilter === "all" ||
        (currentFilter === "LIVE" && $card.find(".badge-live").length > 0) ||
        (currentFilter === "UPCOMING" &&
          $card.find(".badge-upcoming").length > 0) ||
        (currentFilter === "FINISHED" &&
          $card.find(".badge-finished").length > 0);

      // Determine if either team name matches the search text.
      var teamNames = $card
        .find(".team-name")
        .map(function () {
          return $(this).text().toLowerCase();
        })
        .get()
        .join(" ");
      var searchMatch = currentSearch === "" || teamNames.indexOf(currentSearch) !== -1;

      if (statusMatch && searchMatch) {
        $card.show();
        visibleCount++;
      } else {
        $card.hide();
      }
    });

    toggleNoResultsMessage(visibleCount);
  }

  function toggleNoResultsMessage(visibleCount) {
    var $msg = $("#no-results-message");
    if (visibleCount === 0) {
      if ($msg.length === 0) {
        $(
          '<p id="no-results-message" style="text-align:center;padding:20px;color:#888;">No matches found.</p>'
        ).appendTo("#match-list-container");
      }
    } else {
      $msg.remove();
    }
  }

  /* -----------------------------------------------------------------------
     6. PAGE-LEVEL COMMENT SECTION (LocalStorage, scoped to matches.html)
     Same pattern as the one on individual match detail pages, so fans can
     leave general comments about the schedule/season instead of a single
     match.
     ----------------------------------------------------------------------- */
  function buildCommentSection(key) {
    var $section = $(
      '<section class="info-card" id="comments-card">' +
        "<h3>Fan Comments</h3>" +
        '<div class="comment-form">' +
        '<input type="text" id="comment-name" placeholder="Your name" maxlength="30">' +
        '<textarea id="comment-text" placeholder="Say something about the season, a team, or an upcoming match..." maxlength="300"></textarea>' +
        '<button type="button" id="comment-submit" class="btn btn-action">Post Comment</button>' +
        "</div>" +
        '<ul id="comment-list" class="comment-list"></ul>' +
        "</section>"
    );
    $(".main-container").append($section);

    renderComments(key);

    $("#comment-submit").on("click", function () {
      var name = $("#comment-name").val().trim();
      var text = $("#comment-text").val().trim();

      if (!name || !text) {
        alert("Please enter your name and a comment before posting.");
        return;
      }

      var comments = getComments(key);
      comments.push({
        name: name,
        text: text,
        time: new Date().toLocaleString()
      });
      saveComments(key, comments);

      $("#comment-text").val("");
      renderComments(key);
    });
  }

  function getComments(key) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error("Error reading comments from LocalStorage:", e);
      return [];
    }
  }

  function saveComments(key, comments) {
    try {
      localStorage.setItem(key, JSON.stringify(comments));
    } catch (e) {
      console.error("Error saving comments to LocalStorage:", e);
    }
  }

  function renderComments(key) {
    var comments = getComments(key);
    var $list = $("#comment-list").empty();

    if (comments.length === 0) {
      $list.html('<li class="comment-empty">No comments yet — be the first!</li>');
      return;
    }

    comments.forEach(function (c, index) {
      var $item = $(
        '<li class="comment-item">' +
          '<div class="comment-meta"><strong></strong> <span class="comment-time"></span></div>' +
          '<p class="comment-body"></p>' +
          '<button type="button" class="comment-delete" data-index="' +
          index +
          '">Delete</button>' +
          "</li>"
      );
      $item.find("strong").text(c.name);
      $item.find(".comment-time").text(c.time);
      $item.find(".comment-body").text(c.text);
      $list.append($item);
    });

    $(".comment-delete").on("click", function () {
      var idx = $(this).data("index");
      var comments = getComments(key);
      comments.splice(idx, 1);
      saveComments(key, comments);
      renderComments(key);
    });
  }
});
