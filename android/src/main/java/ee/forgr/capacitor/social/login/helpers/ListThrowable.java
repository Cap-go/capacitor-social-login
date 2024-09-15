package ee.forgr.capacitor.social.login.helpers;

import androidx.annotation.NonNull;

import java.io.PrintStream;
import java.io.PrintWriter;
import java.util.List;

public class ListThrowable extends Throwable {

    private List<Throwable> throwableList;

    public ListThrowable(List<Throwable> throwableList) {
        this.throwableList = throwableList;
    }

    @Override
    public void printStackTrace() {
        for (Throwable t: throwableList) {
            t.printStackTrace();
        }
    }

    @Override
    public void printStackTrace(@NonNull PrintStream s) {
        for (Throwable t: throwableList) {
            t.printStackTrace(s);
            s.print("\n\n");
        }
    }

    @Override
    public void printStackTrace(@NonNull PrintWriter s) {
        for (Throwable t: throwableList) {
            t.printStackTrace(s);
            s.print("\n\n");
        }
    }
}
