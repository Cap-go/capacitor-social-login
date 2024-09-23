package ee.forgr.capacitor.social.login.helpers;

import android.os.Build;
import android.util.Log;

import java.util.concurrent.Semaphore;
import java.util.function.Consumer;

import ee.forgr.capacitor.social.login.SocialLoginPlugin;

public class FutureFunctionResult<SUCCESS, ERROR> extends FunctionResult<SUCCESS, ERROR> {
    private Consumer<ERROR> errorConsumer = null;
    private Consumer<SUCCESS> successConsumer = null;

    private FutureFunctionResult(SUCCESS success, ERROR error) {
        super(success, error);
    }

    public FutureFunctionResult() {
        super(null, null);
    }

    @Override
    public FunctionResult<SUCCESS, ERROR> onSuccess(Consumer<SUCCESS> consumer) {
        if (!(Build.VERSION.SDK_INT >= Build.VERSION_CODES.N)) {
            throw new RuntimeException("Android device too old");
        }

        if (success != null || error != null) {
            if (success != null) {
                consumer.accept(success);
            }
            return this;
        } else {
            this.successConsumer = consumer;
            return this;
        }
    }

    @Override
    public FunctionResult<SUCCESS, ERROR> onError(Consumer<ERROR> consumer) {
        if (!(Build.VERSION.SDK_INT >= Build.VERSION_CODES.N)) {
            throw new RuntimeException("Android device too old");
        }

        if (success != null || error != null) {
            if (error != null) {
                consumer.accept(error);
            }
            return this;
        } else {
            this.errorConsumer = consumer;
            return this;
        }
    }

    public static <SUCCESS, ERROR> FutureFunctionResult<SUCCESS, ERROR> success(SUCCESS success) {
        return new FutureFunctionResult<>(success, null);
    }

    public static <SUCCESS, ERROR> FutureFunctionResult<SUCCESS, ERROR> error(ERROR error) {
        return new FutureFunctionResult<>(null, error);
    }

    public void resolveSuccess(SUCCESS success) {
        this.success = success;
        if (this.successConsumer != null) {
            this.successConsumer.accept(success);
        }
    }

    public void resolveError(ERROR error) {
        this.error = error;
        if (this.errorConsumer != null) {
            this.errorConsumer.accept(error);
        }
    }
}
