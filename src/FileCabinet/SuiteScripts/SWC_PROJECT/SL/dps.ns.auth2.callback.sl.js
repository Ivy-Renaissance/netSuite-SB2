/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 *@description 2. Retrieve access and refresh tokens
 * Step 3: Retrieve a profile ID
 */
define(['N/log', 'N/https', 'N/search', 'N/record', 'N/runtime',"N/encode", ], function (log, https, search, record, runtime, encode) {

    function onRequest(context) {
        // https://www.amazon.com/?code=xxxxxxxxxxxxxxxxxxx&scope=advertising%3A%3Acampaign_management
        log.error('context', context);
        var params = context.request.parameters;
        log.error('params', params);
        // var rtn = https.get({
        //     url: 'https://advertising-api.amazon.com/v2/profiles',
        //     headers: {
        //         'Authorization': "Basic Atza|IwEBIMMPvtSUpCDacAbLDTZwIhmCFwDjaglATNuOXRbORZ-ZDjjpQBBvgkfV6sbNmVstTuLl_ezAdyWHx3LArO7plw5SSK2HxeH9KpRkMFOeVibFrhRGViqaRtr2a4QHm0NBo8Vb3KliyA00nhtHd6V4aoNyIDzQNzunK8wML_Sy7CZbp2MP1w38ncOVPa2Hakv4GEaFfpseSLNZKSgo_5ZJ32BvP_PP0o4CmVoK0la6vpfhr3c_Dr-fOiJml5Dahgx3pJZHDza6lk9fNCWJMkOxJcenjwpcyhBc8ADedINL9vDn79bt6iOxZAPyg9xevm-rsm9W97rQKVG7iOxPbDyhUIi6zbsJN3OoqYLdYhTnmKSHYd5OWvIzfMk5_LX1Lw1vGYc",
        //         'Content-Type': 'application/json',
        //         'Access-Control-Allow-Credentials': true,
        //         'Amazon-Advertising-API-ClientId': 'amzn1.application-oa2-client.cfab78926eac4cc8b0ad8671abacd451'
        //     },
        // })
        // log.error('rtn',rtn);
        var code = params.code

        // var auth_url = 'https://business-api.tiktok.com/open_api/v1.3/tt_user/oauth2/token/'
        var auth_url = 'https://business-api.tiktok.com/open_api/v1.3/oauth/token/'

        
        var redirect_uri = encodeURIComponent('https://11297254-sb1.extforms.netsuite.com/app/site/hosting/scriptlet.nl?script=131&deploy=1&compid=11297254_SB1&ns-at=AAEJ7tMQYIlK1DTZBI-inRSKnXKTqBrx25pgZeeiCdA8POmctDU')
        
        var client_id = '7560582483666796561';
        var client_secret = 'f162544ba2c3cd8dc0606e12e497e9edbdb2b2eb'
        var body = {"client_id":"7560582483666796561",
                "client_secret":"f162544ba2c3cd8dc0606e12e497e9edbdb2b2eb",
                "grant_type":"authorization_code",
                "auth_code":code,
                "redirect_uri":redirect_uri
            }
        // var response = https.post({
        //     url: auth_url,
        //     headers: {
        //         'Content-Type': 'application/json',
        //         'Accept': 'application/json'
        //     },
        //     body: JSON.stringify(body)
            
        //     // body: [
        //     //     "grant_type=authorization_code",
        //     //     "code=" + encodeURIComponent(code),
        //     //      "auth_code=" + encodeURIComponent(code),
        //     //      "client_id=" + client_id,
        //     //      "client_secret=" + client_secret,
        //     //     "redirect_uri=" + redirect_uri
        //     // ].join('&')
        // });
        var response = https.post({
            url: auth_url,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            body: [
                "grant_type=authorization_code",
                "code=" + encodeURIComponent(code),
                //  "auth_code=" + encodeURIComponent(code),
                 "client_id=" + client_id,
                 "client_secret=" + client_secret,
                "redirect_uri=" + redirect_uri
            ].join('&')
        });
        log.error('response', response);
        var body = JSON.parse(response.body)
        log.error('body', body);
        var access_token = body.access_token
        log.error('access_token', access_token);
        var refresh_token = body.refresh_token
        log.error('refresh_token', refresh_token);

        if (!refresh_token) {
             context.response.write('授权失败，谢谢~~ <br/>')
             context.response.write(response.body)
             return;
        }
       

        




        context.response.write('授权成功，谢谢~~ <br/>')

        context.response.write('refresh token: <br/>')
        // context.response.write(refresh_token)
         context.response.write('<br/>access_token: <br/>')
        // context.response.write(access_token)
    }

    return {
        onRequest: onRequest
    }
});
