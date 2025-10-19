$(window).on('load', function () {
    setTimeout(() => {
        $('#preloader').fadeOut(0);
    }, 100);
});

$(document).ready(function () {
    $(`a[href="${window.location.pathname}"]`).addClass('active');
    $(`a[href="${window.location.pathname}"]`).css('pointerEvents', 'none');
});

$('.back-to-tops').click(function() {
    $('html, body').animate({
      scrollTop: 0
    }, 800);
    return false;
});

function formatMoney(money) {
    return String(money).replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
}

let checkID = $('html').attr('data-change');
let i = 0;

// Set i based on the checkID value for correct time interval (in minutes or seconds)
if (checkID == 1) i = 1;  // 1 minute
if (checkID == 2) i = 3;  // 3 minutes
if (checkID == 3) i = 5;  // 5 minutes
if (checkID == 4) i = 30; // 30 seconds (but we will use seconds only for checkID == 4)

function cownDownTimer() {
    var countDownDate = new Date("2030-07-16T23:59:59.9999999+01:00").getTime();

    setInterval(function () {
        var now = new Date().getTime();
        var distance = countDownDate - now;

        if (checkID == 4) {
            // For checkID == 4, countdown in seconds (30-second intervals)
            var seconds = Math.floor(distance / 1000); // Convert to total seconds

            // If seconds are greater than 30, reset to 0 for every 30 seconds
            var remainingSeconds = seconds % 30;

            var seconds1 = Math.floor(remainingSeconds / 10);  // Tens place of seconds
            var seconds2 = remainingSeconds % 10;  // Ones place of seconds

            // Update seconds display
            $(".time .time-sub:eq(2)").text(seconds1);
            $(".time .time-sub:eq(3)").text(seconds2);
        } else {
            // For other checkID values (1, 2, 3), countdown in minutes
            var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)); // Get minutes
            var minute = Math.ceil(minutes % i);  // Adjust minute based on interval i
            var seconds1 = Math.floor((distance % (1000 * 60)) / 10000);  // Tens place for seconds
            var seconds2 = Math.floor(((distance % (1000 * 60)) / 1000) % 10);  // Ones place for seconds

            // Update minute display, but not if checkID is 1 (as checkID 1 uses minute interval)
            if (checkID != 1) {
                $(".time .time-sub:eq(1)").text(minute);
            }

            // Update seconds display
            $(".time .time-sub:eq(2)").text(seconds1);
            $(".time .time-sub:eq(3)").text(seconds2);
        }
    }, 500);  // Update every second for accurate countdown
}

cownDownTimer();
