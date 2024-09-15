package ee.forgr.capacitor.social.login.helpers;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.function.Function;

public class ThrowableFunctionResult<SUCCESS> extends FunctionResult<SUCCESS, Throwable> {
    public ThrowableFunctionResult(SUCCESS success, Throwable error) {
        super(success, error);
    }

    public FunctionResult<SUCCESS, String> convertThrowableToString() {
        StringWriter sw = new StringWriter();
        PrintWriter pw = new PrintWriter(sw);
        this.error.printStackTrace(pw);
        return ThrowableFunctionResult.error(sw.toString());
    }

    public <NEW_SUCCESS> ThrowableFunctionResult<NEW_SUCCESS> transformSuccess(ThrowingConsumer<SUCCESS, NEW_SUCCESS> transform) {
        if (android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.N) {
            throw new RuntimeException("Android device too old");
        }
        if (this.isError()) {
            return new ThrowableFunctionResult<>(null, error);
        } else {
            try {
                NEW_SUCCESS val = transform.accept(this.success);
                return new ThrowableFunctionResult<>(val, null);
            } catch (Throwable t) {
                return new ThrowableFunctionResult<>(null, t);
            }
        }
    }
}