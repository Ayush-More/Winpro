socket.on("data-server-k3", function (msg) {
    if (msg) {
        let checkData = $('html').attr('data-dpr');
        if (checkData == msg.game) {
            pageno = 0;
            limit = 10;
            page = 1;
            let notResult = msg.data[0];
            let Result = msg.data[1];
            let check = $('#number_result').attr('data-select');
            if (check == 'all') {
                RenderResult(Result.result);
                reload_money();
                callListOrder();
                RenderResult(Result.result);
            } else {
                RenderResult(Result.result);
                reload_money();
                callAjaxMeJoin();

            }
            $('#period').text(notResult.period);
            $("#previous").addClass("block-click");
            $("#previous").removeClass("action");
            $("#previous .van-icon-arrow").css("color", "#7f7f7f");
            $("#next").removeClass("block-click");
            $("#next").addClass("action");
            $("#next .van-icon-arrow").css("color", "#fff");

            // Check for win/loss and show popup
            checkK3WinLoss(Result.period);
        }
    }
});

// Function to check K3 win/loss and show popup
function checkK3WinLoss(period) {
    // Wait a moment for the result to be processed
    setTimeout(() => {
        $.ajax({
            type: "POST",
            url: "/api/webapi/GetMyEmerdList",
            data: {
                gameJoin: $('html').attr('data-dpr'),
                pageno: 0,
                pageto: 1
            },
            dataType: "json",
            success: function(response) {
                if (response.status && response.data && response.data.gameslist && response.data.gameslist.length > 0) {
                    let latestBet = response.data.gameslist[0];

                    // Check if this is the bet for the current period
                    if (latestBet.stage == period) {
                        let isWin = latestBet.get > 0;
                        let amount = latestBet.get > 0 ? latestBet.get : latestBet.money;

                        showK3ResultPopup(isWin, amount, latestBet.bet, latestBet.result);
                    }
                }
            },
            error: function() {
                console.log('Error checking K3 win/loss');
            }
        });
    }, 2000); // Wait 2 seconds for result processing
}

// Function to show K3 win/loss popup
function showK3ResultPopup(isWin, amount, bet, result) {
    let popupClass = isWin ? 'win-popup' : 'loss-popup';
    let popupTitle = isWin ? 'Congratulations!' : 'Better Luck Next Time!';
    let popupIcon = isWin ? '🎉' : '😔';
    let amountText = isWin ? `+₹${amount.toFixed(2)}` : `-₹${amount.toFixed(2)}`;
    let amountColor = isWin ? '#4CAF50' : '#f44336';

    let popupHtml = `
        <div class="k3-result-popup ${popupClass}" style="
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #1a1a2e, #16213e);
            border-radius: 20px;
            padding: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            z-index: 10000;
            text-align: center;
            min-width: 300px;
            border: 2px solid ${isWin ? '#4CAF50' : '#f44336'};
            animation: popupSlideIn 0.5s ease-out;
        ">
            <div style="font-size: 48px; margin-bottom: 15px;">${popupIcon}</div>
            <h3 style="color: white; margin: 0 0 15px 0; font-size: 24px;">${popupTitle}</h3>
            <div style="color: ${amountColor}; font-size: 32px; font-weight: bold; margin: 15px 0;">
                ${amountText}
            </div>
            <div style="color: #ccc; margin: 10px 0;">
                <div>Your Bet: ${bet}</div>
                <div>Result: ${result}</div>
            </div>
            <button onclick="closeK3ResultPopup()" style="
                background: ${isWin ? '#4CAF50' : '#f44336'};
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 25px;
                font-size: 16px;
                cursor: pointer;
                margin-top: 15px;
                transition: all 0.3s;
            " onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
                Continue Playing
            </button>
        </div>
        <div class="k3-popup-overlay" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            z-index: 9999;
        " onclick="closeK3ResultPopup()"></div>
        <style>
            @keyframes popupSlideIn {
                from {
                    transform: translate(-50%, -50%) scale(0.5);
                    opacity: 0;
                }
                to {
                    transform: translate(-50%, -50%) scale(1);
                    opacity: 1;
                }
            }
        </style>
    `;

    // Remove any existing popup
    $('.k3-result-popup, .k3-popup-overlay').remove();

    // Add new popup
    $('body').append(popupHtml);

    // Auto close after 5 seconds
    setTimeout(() => {
        closeK3ResultPopup();
    }, 5000);
}

// Function to close K3 result popup
function closeK3ResultPopup() {
    $('.k3-result-popup, .k3-popup-overlay').fadeOut(300, function() {
        $(this).remove();
    });
}

function ShowListOrder(list_orders) {
    if (list_orders.length == 0) {
        
        return $(`#list_order`).html(
            `
            <div data-v-a9660e98="" class="van-empty">
                <div class="van-empty__image">
                    <img src="/images/empty-image-default.png" />
                </div>
                <p class="van-empty__description">No data</p>
            </div>
            `
        );
    }
    
    let htmls = "";
    let result = list_orders.map((list_orders) => {
        let total = String(list_orders.result).split('');
        let total2 = 0;
        for (let i = 0; i < total.length; i++) {
            total2 += Number(total[i]);
        }

        let html2 = '';
        for (let i = 0; i < total.length; i++) {
            html2 += `
                <div data-v-03b808c2="" class="li img${total[i]}"></div>
            `;
        }

        return (htmls += `
            <div data-v-03b808c2="" class="c-tc item van-row">
                <div data-v-03b808c2="" class="van-col van-col--6">
                    <div data-v-03b808c2="" class="c-tc goItem lh">${list_orders.period}</div>
                </div>
                <div data-v-03b808c2="" class="van-col van-col--4">
                    <div data-v-03b808c2="" class="c-tc goItem lh"> ${total2} </div>
                </div>
                <div data-v-03b808c2="" class="van-col van-col--5">
                    <div data-v-03b808c2="" class="c-tc goItem lh">
                        <div data-v-03b808c2="">${(total2 >= 3 && total2 <= 10) ? "Small" : "Big"}</div>
                    </div>
                </div>
                <div data-v-03b808c2="" class="van-col van-col--4">
                    <div data-v-03b808c2="" class="c-tc goItem lh">
                        <div data-v-03b808c2="">${(total2 % 2 == 0) ? "Even" : "Odd"}</div>
                    </div>
                </div>
                <div data-v-03b808c2="" class="van-col van-col--5">
                    <div data-v-03b808c2="" class="goItem c-row c-tc c-row-between c-row-middle">
                        ${html2}
                    </div>
                </div>
            </div>
        `);
    });
    $(`#list_order`).html(htmls);
}

function formateT(params) {
    let result = (params < 10) ? "0" + params : params;
    return result;
}

function timerJoin(params = '') {
    let date = '';
    if (params) {
        date = new Date(Number(params));
    } else {
        date = new Date();
    }
    let years = formateT(date.getFullYear());
    let months = formateT(date.getMonth() + 1);
    let days = formateT(date.getDate());

    let hours = formateT(date.getHours());
    let minutes = formateT(date.getMinutes());
    let seconds = formateT(date.getSeconds());
    return years + '-' + months + '-' + days + ' ' + hours + ':' + minutes + ':' + seconds;
}

function GetMyEmerdList(list_orders) {
    
    if (list_orders.length == 0) {
        return $(`#list_order`).html(
            `
            <div data-v-a9660e98="" class="van-empty">
                <div class="van-empty__image">
                    <img src="/images/empty-image-default.png" />
                </div>
                <p class="van-empty__description">No Data</p>
            </div>
            `
        );
    }
    let htmls = "";
    let result = list_orders.map((list_order) => {
        return (htmls += `
            <div data-v-03b808c2="">
                <div data-v-03b808c2="" class="item c-row">
                    <div data-v-03b808c2="" class="c-row c-row-between c-row-middle info">
                        <div data-v-03b808c2="">
                            <div data-v-03b808c2="" class="issueName">
                                ${list_order.stage}
                                <!---->
                                <span data-v-03b808c2="" class="state ${(list_order.status == 1) ? 'green' : 'red'} ${(list_order.status == 0) ? 'd-none' : ''}">${(list_order.status == 1) ? 'Success' : 'Failure'}</span>
                            </div>
                            <div data-v-03b808c2="" class="tiem">${timerJoin(list_order.time)}</div>
                        </div>
                        <div data-v-03b808c2="" class="money ${(list_order.status == 0) ? 'd-none' : ''}">
                            <!---->
                            <span data-v-03b808c2="" class="${(list_order.status == 1) ? 'success' : 'fail'}"> ${(list_order.status == 1) ? '+' : '-'}${(list_order.status == 1) ? list_order.get : list_order.price}.00 </span>
                        </div>
                    </div>
                </div>
                <!---->
            </div>    
        `);
    });
    $(`#list_order`).html(htmls);
}

function callListOrder() {
    $.ajax({
        type: "POST",
        url: "/api/webapi/k3/GetNoaverageEmerdList",
        data: {
            gameJoin: $('html').attr('data-dpr'),
            pageno: "0",
            pageto: "10",
        },
        dataType: "json",
        success: function (response) {
            let list_orders = response.data.gameslist;
            $("#period").text(response.period);
            $("#number_result").text("1/" + response.page);
            ShowListOrder(list_orders);
            $('.Loading').fadeOut(0);
            let result = String(list_orders[0].result).split('');
            $('.slot-transform:eq(0) .slot-num').attr('class', `slot-num bg${result[0]}`);
            $('.slot-transform:eq(1) .slot-num').attr('class', `slot-num bg${result[1]}`);
            $('.slot-transform:eq(2) .slot-num').attr('class', `slot-num bg${result[2]}`);
        },
    });
}

callListOrder();

function callAjaxMeJoin() {
    
    $.ajax({
        type: "POST",
        url: "/api/webapi/k3/GetMyEmerdList",
        data: {
            gameJoin: $('html').attr('data-dpr'),
            pageno: "0",
            pageto: "10",
        },
        dataType: "json",
        success: function (response) {
            let data = response.data.gameslist;
            $("#number_result").text("1/" + response.page);
            GetMyEmerdList(data);
            $('.Loading').fadeOut(0);
        },
    });
}


$('#history').click(function (e) { 
    e.preventDefault();
    callListOrder();
    $('.header-history').removeClass('d-none');
    $(this).addClass('block-click action');
    $('#myBet').removeClass('block-click action');
    $('#number_result').attr('data-select', 'all');
    pageno = 0;
    limit = 10;
    page = 1;
    $("#next").removeClass("block-click");
    $("#next").addClass("action");
    $("#next .van-icon-arrow").css("color", "#fff");
    $("#previous").addClass("block-click");
    $("#previous").removeClass("action");
    $("#previous .van-icon-arrow-left").css("color", "#7f7f7f");
});

$('#myBet').click(function (e) { 
    e.preventDefault();
    callAjaxMeJoin();
    $('.header-history').addClass('d-none');
    $(this).addClass('block-click action');
    $('#history').removeClass('block-click action');
    $('#number_result').attr('data-select', 'mybet');
    pageno = 0;
    limit = 10;
    page = 1;
    $("#next").removeClass("block-click");
    $("#next").addClass("action");
    $("#next .van-icon-arrow").css("color", "#fff");
    $("#previous").addClass("block-click");
    $("#previous").removeClass("action");
    $("#previous .van-icon-arrow-left").css("color", "#7f7f7f");
});


var pageno = 0;
var limit = 10;
var page = 1;
$("#next").click(function (e) {
    e.preventDefault();
    let check = $('#number_result').attr('data-select');
    $('.Loading').fadeIn(0);
    $("#previous").removeClass("block-click");
    $("#previous").addClass("action");
    $("#previous .van-icon-arrow-left").css("color", "#fff");
    pageno += 10;
    let pageto = limit;
    let url = '';
    if (check == 'all') {
        url = "/api/webapi/k3/GetNoaverageEmerdList";
    } else {
        url = "/api/webapi/k3/GetMyEmerdList";
    }
    $.ajax({
        type: "POST",
        url: url,
        data: {
            gameJoin: $('html').attr('data-dpr'),
            pageno: pageno,
            pageto: pageto,
        },
        dataType: "json",
        success: async function (response) {
            $('.Loading').fadeOut(0);
            if (response.status === false) {
                pageno -= 10;
                $("#next").addClass("block-click");
                $("#next").removeClass("action");
                $("#next .van-icon-arrow").css("color", "#7f7f7f");
                alertMess(response.msg);
                return false;
            }
            let list_orders = response.data.gameslist;
            $("#period").text(response.period);
            $("#number_result").text(++page + "/" + response.page);
            if (check == 'all') {
                ShowListOrder(list_orders);
            } else {
                GetMyEmerdList(list_orders);
            }
        },
    });
});
$("#previous").click(function (e) {
    e.preventDefault();
    let check = $('#number_result').attr('data-select');
    $('.Loading').fadeIn(0);
    $("#next").removeClass("block-click");
    $("#next").addClass("action");
    $("#next .van-icon-arrow").css("color", "#fff");
    pageno -= 10;
    let pageto = limit;
    let url = '';
    if (check == 'all') {
        url = "/api/webapi/k3/GetNoaverageEmerdList";
    } else {
        url = "/api/webapi/k3/GetMyEmerdList";
    }
    $.ajax({
        type: "POST",
        url: url,
        data: {
            gameJoin: $('html').attr('data-dpr'),
            pageno: pageno,
            pageto: pageto,
        },
        dataType: "json",
        success: async function (response) {
            $('.Loading').fadeOut(0);
            if (page - 1 < 2) {
                $("#previous").addClass("block-click");
                $("#previous").removeClass("action");
                $("#previous .van-icon-arrow-left").css("color", "#7f7f7f");
            }
            if (response.status === false) {
                pageno = 0;
                $("#previous .arr:eq(0)").addClass("block-click");
                $("#previous .arr:eq(0)").removeClass("action");
                $("#previous .van-icon-arrow-left").css("color", "#7f7f7f");
                alertMess(response.msg);
                return false;
            }
            let list_orders = response.data.gameslist;
            $("#period").text(response.period);
            $("#number_result").text(--page + "/" + response.page);
            if (check == 'all') {
                ShowListOrder(list_orders);
            } else {
                GetMyEmerdList(list_orders);
            }
        },
    });
});
