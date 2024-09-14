package ee.forgr.capacitor.social.login;

import android.os.Build;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.util.function.Consumer;
import java.util.function.Function;

public class FunctionResult<SUCCESS, ERROR> {

    public static class ThrowableFunctionResult<SUCCESS> extends FunctionResult<SUCCESS, Throwable> {
        public ThrowableFunctionResult(SUCCESS success, Throwable error) {
            super(success, error);
        }

        public FunctionResult<SUCCESS, String> convertThrowableToString() {
            StringWriter sw = new StringWriter();
            PrintWriter pw = new PrintWriter(sw);
            this.error.printStackTrace(pw);
            return ThrowableFunctionResult.error(sw.toString());
        }
    }

    protected SUCCESS success;
    protected ERROR error;

    protected FunctionResult(SUCCESS success, ERROR error) {
        this.success = success;
        this.error = error;
    }

    public FunctionResult<SUCCESS, ERROR> onSuccess(Consumer<SUCCESS> consumer) {
        if (success != null) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                consumer.accept(success);
            } else {
                throw new RuntimeException("Android device too old");
            }
        }
        return this;
    }

    public FunctionResult<SUCCESS, ERROR> onError(Consumer<ERROR> consumer) {
        if (consumer != null) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                consumer.accept(error);
                return this;
            } else {
                throw new RuntimeException("Android device too old");
            }
        }
        return this;
    }

//    public FunctionResult<SUCCESS, String> convertThrowableToString() {
//        if (error instanceof Throwable) {
//
//        }
//    }

    public static <SUCCESS, ERROR> FunctionResult<SUCCESS, ERROR> success(SUCCESS success) {
        return new FunctionResult<>(success, null);
    }

    public static <SUCCESS, ERROR> FunctionResult<SUCCESS, ERROR> error(ERROR error) {
        return new FunctionResult<>(null, error);
    }
}

