/* SmtpJS.com - v3.0.1 */
var Email = {
    send: function (a) {
        return new Promise(function (b, c) {
            a.nocache = Math.floor(1e6 * Math.random() + 1), a.Action = "Send";
            var d = JSON.stringify(a);
            Email.ajaxPost("https://smtpjs.com/v1/sendemail.aspx", d, function (e) {
                b(e)
            })
        })
    },
    ajaxPost: function (a, b, c) {
        var d = Email.createCORSRequest("POST", a);
        d.setRequestHeader("Content-type", "application/x-www-form-urlencoded"), d.onload = function () {
            var a = d.responseText;
            null != c && c(a)
        }, d.send(b)
    },
    ajax: function (a, b) {
        var c = Email.createCORSRequest("GET", a);
        c.onload = function () {
            var a = c.responseText;
            null != b && b(a)
        }, c.send()
    },
    createCORSRequest: function (a, b) {
        var c = new XMLHttpRequest;
        return "withCredentials" in c ? c.open(a, b, !0) : "undefined" != typeof XDomainRequest ? (c = new XDomainRequest, c.open(a, b)) : c = null, c
    }
};
