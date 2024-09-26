package ee.forgr.capacitor.social.login.helpers;

@FunctionalInterface
public interface ThrowingConsumer<T, V> {
  V accept(T t) throws Throwable;
}
