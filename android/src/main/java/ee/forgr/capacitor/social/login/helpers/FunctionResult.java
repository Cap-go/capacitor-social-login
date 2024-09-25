package ee.forgr.capacitor.social.login.helpers;

import android.os.Build;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.util.function.Consumer;
import java.util.function.Function;

public class FunctionResult<SUCCESS, ERROR> {
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
        if (error != null) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                consumer.accept(error);
                return this;
            } else {
                throw new RuntimeException("Android device too old");
            }
        }
        return this;
    }

    public boolean isError() {
        return this.error != null;
    }

    public boolean isSuccess() {
        return this.success != null;
    }

    public <NEW_SUCCESS> FunctionResult<NEW_SUCCESS, ERROR> disregardSuccess() {
        if (!this.isError()) {
            throw new RuntimeException("Cannot disregard success, function is successful");
        }
        return new FunctionResult<NEW_SUCCESS, ERROR>(null, this.error);
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

    public SUCCESS getSuccess() {
        if (!this.isSuccess()) {
            throw new RuntimeException("Cannot get success, function errored");
        }
        return success;
    }

    public ERROR getError() {
        if (!this.isError()) {
            throw new RuntimeException("Cannot get error, function is successful");
        }
        return error;
    }
}

