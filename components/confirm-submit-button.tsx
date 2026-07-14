"use client";

type ConfirmSubmitButtonProps = {
    children: React.ReactNode;
    message: string;
    className?: string;
    disabled?: boolean;
};

export function ConfirmSubmitButton({
    children,
    message,
    className,
    disabled = false,
}: ConfirmSubmitButtonProps) {
    return (
        <button
            type="submit"
            className={className}
            disabled={disabled}
            onClick={(event) => {
                if (disabled) {
                    event.preventDefault();
                    return;
                }

                const confirmed = window.confirm(message);

                if (!confirmed) {
                    event.preventDefault();
                }
            }}
        >
            {children}
        </button>
    );
}
