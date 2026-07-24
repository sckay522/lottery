package com.lottery.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;

public class ApiProxyPlugin extends Plugin {

    @PluginMethod
    public void fetch(PluginCall call) {
        String url = call.getString("url");
        if (url == null) {
            call.reject("url is required");
            return;
        }

        new Thread(() -> {
            try {
                HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
                conn.setConnectTimeout(15000);
                conn.setReadTimeout(15000);
                conn.setRequestProperty("User-Agent", "Mozilla/5.0");

                int code = conn.getResponseCode();
                BufferedReader reader = new BufferedReader(
                    new InputStreamReader(conn.getInputStream(), "UTF-8")
                );
                StringBuilder resp = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    resp.append(line);
                }
                reader.close();

                JSObject result = new JSObject();
                result.put("status", code);
                result.put("data", resp.toString());
                call.resolve(result);
            } catch (Exception e) {
                call.reject(e.getMessage());
            }
        }).start();
    }
}
