package ee.forgr.capacitor.social.login.helpers;

import org.json.JSONObject;

import java.util.Map;

public class JsonHelper {
    public static ThrowableFunctionResult<JSONObject> mapToJsonObject(Map<String, Object> map) {
        try {
            JSONObject object = new JSONObject();
            for (Map.Entry<String, Object> mapSet : map.entrySet()) {
                Object mapObject = mapSet.getValue();
                String key = mapSet.getKey();

                if (mapObject instanceof String) {
                    object.put(key, mapObject);
                } else {
                    throw new RuntimeException(String.format("Object %s of class name '' cannot be turned into json", object, object.getClass().getName()));
                }
            }
            return new ThrowableFunctionResult<>(object, null);
        } catch (Throwable t) {
            return new ThrowableFunctionResult<>(null, t);
        }

    }
}
